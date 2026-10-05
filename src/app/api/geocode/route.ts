import { NextResponse } from "next/server";
import airportData from "@/server/data/airports.json";
import stationData from "@/server/data/stations.json";

// Suggestions pour un champ « ville » : les villes d'abord, puis les lieux de transport
// (aéroports, gares, ports, gares routières) — pratique pour les départs/arrivées en avion, train ou ferry.
type Kind = "city" | "airport" | "train" | "port" | "bus";
type Hit = { label: string; lat: number; lng: number; kind: Kind };

const KIND_LABEL: Record<Kind, string | null> = {
  city: null,
  airport: "Aéroport",
  train: "Gare",
  port: "Port",
  bus: "Gare routière",
};

// Mapbox décrit un lieu par `maki` (icône) et `category` (texte anglais). On ne garde que les lieux de transport.
function transportKind(props: any): Exclude<Kind, "city"> | null {
  const maki = String(props?.maki ?? "").toLowerCase();
  const cat = String(props?.category ?? "").toLowerCase();
  if (maki === "airport" || /\bairport\b|aerodrome/.test(cat)) return "airport";
  if (maki === "ferry" || maki === "harbor" || /ferry|harbou?r|\bport\b|seaport/.test(cat)) return "port";
  if (maki === "bus" || /bus station|bus terminal|coach/.test(cat)) return "bus";
  if (maki === "rail" || /railway|train station|rail station/.test(cat)) return "train";
  return null;
}


// Sources des données locales :
//  - Aéroports : OurAirports (domaine public), aéroports avec vols commerciaux.
//  - Gares : Trainline EU « stations » (https://github.com/trainline-eu/stations), licence ODbL — © Trainline EU
//    et contributeurs (OpenStreetMap, SNCF Open Data, GeoNames). Couvre surtout l'Europe.
// ── Aéroports : liste mondiale locale (OurAirports, vols commerciaux) ──────────────────────────
// Ligne : [code IATA, nom, ville, pays ISO, lat, lng, taille (0 = grand, 1 = moyen, 2 = petit)]
type AirportRow = [string, string, string, string, number, number, number];
const AIRPORTS = airportData as AirportRow[];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const COUNTRY_NAMES = new Intl.DisplayNames(["fr"], { type: "region" });
const countryName = (iso: string) => {
  try {
    return COUNTRY_NAMES.of(iso) ?? iso;
  } catch {
    return iso;
  }
};

// Texte de recherche pré-calculé une seule fois (reste en mémoire tant que le serveur est chaud).
const SEARCHABLE = AIRPORTS.map((a) => norm(`${a[0]} ${a[1]} ${a[2]}`));

function km(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = Math.PI / 180;
  const h =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// « Charles de Gaulle International Airport » → « Charles de Gaulle » (le badge « Aéroport » le dit déjà).
const shortAirportName = (name: string) =>
  name.replace(/\s+(International\s+)?(Airport|Airfield|Aerodrome)$/i, "").replace(/\s+International$/i, "").trim() || name;

function airportHit(a: AirportRow): Hit {
  return {
    label: `${shortAirportName(a[1])} (${a[0]}), ${a[2]}, ${countryName(a[3])}`,
    lat: a[4],
    lng: a[5],
    kind: "airport",
  };
}

// 1) code IATA exact (« CDG »), 2) nom/ville commençant par la saisie ou la contenant,
// 3) aéroports proches de la première ville trouvée par Mapbox (« Paris » → CDG, Orly…),
//    ce qui marche même quand la ville est écrite en français et l'aéroport en anglais.
function findAirports(query: string, topCity?: { lat: number; lng: number }): Hit[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const picked = new Map<string, { a: AirportRow; score: number }>();
  const add = (a: AirportRow, score: number) => {
    const prev = picked.get(a[0]);
    if (!prev || score < prev.score) picked.set(a[0], { a, score });
  };

  AIRPORTS.forEach((a, i) => {
    const text = SEARCHABLE[i];
    if (a[0].toLowerCase() === q) add(a, -100);
    else if (q.length >= 3 && (text.includes(` ${q}`) || text.startsWith(q))) add(a, a[6] * 10 + 5);
  });

  if (topCity) {
    for (const a of AIRPORTS) {
      const d = km(topCity.lat, topCity.lng, a[4], a[5]);
      if (d <= 60) add(a, a[6] * 10 + d / 10);
    }
  }

  return [...picked.values()].sort((x, y) => x.score - y.score).slice(0, 4).map((p) => airportHit(p.a));
}

// ── Gares : liste locale (Trainline EU, surtout l'Europe) ──────────────────────────────────────
// Ligne : [nom, pays ISO, lat, lng, gare principale (1) ou non (0)]
type StationRow = [string, string, number, number, number];
const STATIONS = stationData as StationRow[];
// Le fichier contient aussi des gares routières : on les étiquette « Gare routière » plutôt que « Gare ».
const BUS_STATION = /gare routi[eè]re|busbahnhof|bus station|bus terminal|autostazione|estaci[oó]n de autobuses|autobusov|busstation/i;
const STATION_TEXT = STATIONS.map((st) => norm(st[0]));

// 1) nom commençant par la saisie ou contenant un mot qui la commence (« Paris » → Gare du Nord, Lyon…),
// 2) gares principales proches de la première ville Mapbox (« Londres » → London St Pancras…).
// Les gares principales passent d'abord, puis les noms les plus courts.
function findStations(query: string, topCity?: { lat: number; lng: number }): Hit[] {
  const q = norm(query);
  if (q.length < 3) return [];
  const picked = new Map<number, number>();
  STATIONS.forEach((st, i) => {
    const text = STATION_TEXT[i];
    if (text.startsWith(q) || text.includes(` ${q}`)) picked.set(i, (st[4] ? 0 : 100) + st[0].length);
  });
  if (topCity) {
    STATIONS.forEach((st, i) => {
      if (!st[4] || picked.has(i)) return;
      const d = km(topCity.lat, topCity.lng, st[2], st[3]);
      if (d <= 15) picked.set(i, 50 + d);
    });
  }
  // Les données contiennent aussi une ligne par ville (« Paris », « Madrid »…) : on l'écarte quand
  // de vraies gares de cette ville existent (« Paris Gare du Nord »), pour ne pas doubler la suggestion « ville ».
  const hasSiblings = [...picked.keys()].some((i) => STATION_TEXT[i].startsWith(`${q} `));
  return [...picked.entries()]
    .filter(([i]) => !(hasSiblings && STATION_TEXT[i] === q && !STATIONS[i][4]))
    .sort((x, y) => x[1] - y[1])
    .slice(0, 3)
    .map(([i]): Hit => ({
      label: `${STATIONS[i][0]}, ${countryName(STATIONS[i][1])}`,
      lat: STATIONS[i][2],
      lng: STATIONS[i][3],
      kind: BUS_STATION.test(STATIONS[i][0]) ? "bus" : "train",
    }));
}

// Mapbox renvoie aussi des villes « approchantes » sans rapport (« Gare de » → Ware, Gary, Gore…).
// Une ville n'est « pertinente » que si son nom commence par la saisie (ou la contient comme mot).
// Les aéroports/gares proches ne sont cherchés que pour une ville pertinente.
function mergeSuggestions(query: string, cities: Hit[], hubs: Hit[]): Hit[] {
  const q = norm(query);
  const isRelevant = (c: Hit) => {
    const name = norm(c.label.split(",")[0]);
    return name.startsWith(q) || q.startsWith(name) || name.includes(` ${q}`);
  };
  const relevant = cities.filter(isRelevant);
  const others = cities.filter((c) => !isRelevant(c));

  // La recherche « autour de la ville » n'a lieu que si la saisie couvre presque tout le nom de la ville
  // (« Paris » oui ; « Gare » pour « Garessio » non), sinon on ne trouve que des lieux sans rapport.
  const top = relevant[0];
  const topName = top ? norm(top.label.split(",")[0]) : "";
  const near = top && q.length >= Math.ceil(topName.length * 0.75) ? top : undefined;

  const airports = findAirports(query, near);
  const stations = findStations(query, near);

  // Ordre : la ville principale, puis ses aéroports et ses gares (listes locales), puis les autres villes
  // pertinentes, les lieux de transport trouvés par Mapbox, le reste, et en dernier les villes approchantes.
  const all = [
    ...relevant.slice(0, 1),
    ...airports.slice(0, 3),
    ...stations.slice(0, 2),
    ...relevant.slice(1, 4),
    ...hubs,
    ...airports.slice(3),
    ...stations.slice(2),
    ...relevant.slice(4),
    ...others,
  ];
  const seen = new Set<string>();
  return all.filter((s) => {
    if (seen.has(s.label)) return false;
    seen.add(s.label);
    return true;
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  if (!query || query.length < 2) return NextResponse.json([]);

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    // Pas de clé configurée : on ne bloque pas le formulaire, on renvoie juste
    // les villes (l'utilisateur peut toujours saisir le texte librement) ; les aéroports, eux, marchent sans clé.
    return NextResponse.json(
      [...findAirports(query), ...findStations(query)].map((s) => ({ ...s, kindLabel: KIND_LABEL[s.kind] }))
    );
  }

  const base = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
  const [placesRes, poiRes] = await Promise.all([
    fetch(`${base}?types=place&language=fr&limit=5&access_token=${token}`).catch(() => null),
    fetch(`${base}?types=poi&language=fr&limit=10&access_token=${token}`).catch(() => null),
  ]);

  const cities: Hit[] = placesRes?.ok
    ? ((await placesRes.json()).features ?? []).map((f: any): Hit => ({
        label: f.place_name,
        lat: f.center[1],
        lng: f.center[0],
        kind: "city",
      }))
    : [];

  const hubs: Hit[] = poiRes?.ok
    ? ((await poiRes.json()).features ?? []).flatMap((f: any): Hit[] => {
        const kind = transportKind(f.properties);
        return kind ? [{ label: f.place_name, lat: f.center[1], lng: f.center[0], kind }] : [];
      })
    : [];

  const merged = mergeSuggestions(query, cities, hubs);

  return NextResponse.json(
    merged.slice(0, 8).map((s) => ({ ...s, kindLabel: KIND_LABEL[s.kind] }))
  );
}

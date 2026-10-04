import { NextResponse } from "next/server";

// Suggestions pour un champ « ville » : les villes d'abord, puis les lieux de transport
// (aéroports, gares, ports, gares routières) — pratique pour les départs/arrivées en avion, train ou ferry.
type Kind = "city" | "airport" | "train" | "port" | "bus";

const KIND_LABEL: Record<Exclude<Kind, "city">, string> = {
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  if (!query || query.length < 2) return NextResponse.json([]);

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    // Pas de clé configurée : on ne bloque pas le formulaire, on renvoie juste
    // aucune suggestion (l'utilisateur peut toujours saisir le texte librement).
    return NextResponse.json([]);
  }

  const base = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
  const [placesRes, poiRes] = await Promise.all([
    fetch(`${base}?types=place&language=fr&limit=5&access_token=${token}`).catch(() => null),
    fetch(`${base}?types=poi&language=fr&limit=10&access_token=${token}`).catch(() => null),
  ]);

  const cities = placesRes?.ok
    ? ((await placesRes.json()).features ?? []).map((f: any) => ({
        label: f.place_name as string,
        lat: f.center[1] as number,
        lng: f.center[0] as number,
        kind: "city" as Kind,
      }))
    : [];

  const hubs = poiRes?.ok
    ? ((await poiRes.json()).features ?? []).flatMap((f: any) => {
        const kind = transportKind(f.properties);
        return kind ? [{ label: f.place_name as string, lat: f.center[1] as number, lng: f.center[0] as number, kind }] : [];
      })
    : [];

  // Villes d'abord (4 au plus), puis les lieux de transport, 8 suggestions maximum, sans doublon.
  const seen = new Set<string>();
  const merged = [...cities.slice(0, 4), ...hubs, ...cities.slice(4)].filter((s) => {
    if (seen.has(s.label)) return false;
    seen.add(s.label);
    return true;
  });

  return NextResponse.json(
    merged.slice(0, 8).map((s) => ({ ...s, kindLabel: s.kind === "city" ? null : KIND_LABEL[s.kind] }))
  );
}

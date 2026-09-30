// Données de démonstration : 50 trajets + 50 colis cohérents (fonctions pures, sans base de données).
// Tous les comptes créés se terminent par @demo.coliz (purge facile).
//
// Cohérence recherchée :
// - trajets répartis sur ~30 villes / 15 pays (Maghreb, Afrique de l'Ouest et centrale, Turquie, Europe) ;
// - chaque voyageur a des « pays d'attache » : il reçoit surtout des trajets vers/depuis ces pays ;
// - chaque expéditeur envoie vers/depuis les pays qu'il connaît ;
// - le contenu des colis dépend du sens (produits du pays vers la France, électronique/vêtements vers le pays) ;
// - ~1 colis sur 4 n'a volontairement aucun trajet correspondant (la recherche ne doit pas toujours réussir).

import { computeBookingAmounts } from "../pricing";

type City = { name: string; country: string; lat: number; lng: number };

const C: Record<string, City> = {
  // France
  paris: { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  lyon: { name: "Lyon", country: "France", lat: 45.764, lng: 4.8357 },
  marseille: { name: "Marseille", country: "France", lat: 43.2965, lng: 5.3698 },
  nantes: { name: "Nantes", country: "France", lat: 47.2184, lng: -1.5536 },
  bordeaux: { name: "Bordeaux", country: "France", lat: 44.8378, lng: -0.5792 },
  lille: { name: "Lille", country: "France", lat: 50.6292, lng: 3.0573 },
  toulouse: { name: "Toulouse", country: "France", lat: 43.6047, lng: 1.4442 },
  strasbourg: { name: "Strasbourg", country: "France", lat: 48.5734, lng: 7.7521 },
  nice: { name: "Nice", country: "France", lat: 43.7102, lng: 7.262 },
  rennes: { name: "Rennes", country: "France", lat: 48.1173, lng: -1.6778 },
  montpellier: { name: "Montpellier", country: "France", lat: 43.6108, lng: 3.8767 },
  // Algérie
  alger: { name: "Alger", country: "Algérie", lat: 36.7538, lng: 3.0588 },
  oran: { name: "Oran", country: "Algérie", lat: 35.6971, lng: -0.6308 },
  constantine: { name: "Constantine", country: "Algérie", lat: 36.365, lng: 6.6147 },
  bejaia: { name: "Béjaïa", country: "Algérie", lat: 36.7509, lng: 5.0567 },
  annaba: { name: "Annaba", country: "Algérie", lat: 36.9, lng: 7.7667 },
  tlemcen: { name: "Tlemcen", country: "Algérie", lat: 34.8783, lng: -1.315 },
  setif: { name: "Sétif", country: "Algérie", lat: 36.1898, lng: 5.4108 },
  tizi: { name: "Tizi Ouzou", country: "Algérie", lat: 36.7118, lng: 4.0459 },
  // Maroc
  casablanca: { name: "Casablanca", country: "Maroc", lat: 33.5731, lng: -7.5898 },
  marrakech: { name: "Marrakech", country: "Maroc", lat: 31.6295, lng: -7.9811 },
  tanger: { name: "Tanger", country: "Maroc", lat: 35.7595, lng: -5.834 },
  fes: { name: "Fès", country: "Maroc", lat: 34.0181, lng: -5.0078 },
  // Tunisie
  tunis: { name: "Tunis", country: "Tunisie", lat: 36.8065, lng: 10.1815 },
  sousse: { name: "Sousse", country: "Tunisie", lat: 35.8256, lng: 10.6084 },
  // Afrique de l'Ouest et centrale
  dakar: { name: "Dakar", country: "Sénégal", lat: 14.7167, lng: -17.4677 },
  abidjan: { name: "Abidjan", country: "Côte d'Ivoire", lat: 5.36, lng: -4.0083 },
  bamako: { name: "Bamako", country: "Mali", lat: 12.6392, lng: -8.0029 },
  douala: { name: "Douala", country: "Cameroun", lat: 4.0511, lng: 9.7679 },
  // Turquie
  istanbul: { name: "Istanbul", country: "Turquie", lat: 41.0082, lng: 28.9784 },
  // Europe
  bruxelles: { name: "Bruxelles", country: "Belgique", lat: 50.8503, lng: 4.3517 },
  madrid: { name: "Madrid", country: "Espagne", lat: 40.4168, lng: -3.7038 },
  barcelone: { name: "Barcelone", country: "Espagne", lat: 41.3874, lng: 2.1686 },
  rome: { name: "Rome", country: "Italie", lat: 41.9028, lng: 12.4964 },
  lisbonne: { name: "Lisbonne", country: "Portugal", lat: 38.7223, lng: -9.1393 },
  porto: { name: "Porto", country: "Portugal", lat: 41.1579, lng: -8.6291 },
  bucarest: { name: "Bucarest", country: "Roumanie", lat: 44.4268, lng: 26.1025 },
  varsovie: { name: "Varsovie", country: "Pologne", lat: 52.2297, lng: 21.0122 },
  londres: { name: "Londres", country: "Royaume-Uni", lat: 51.5074, lng: -0.1278 },
  francfort: { name: "Francfort", country: "Allemagne", lat: 50.1109, lng: 8.6821 },
  berlin: { name: "Berlin", country: "Allemagne", lat: 52.52, lng: 13.405 },
  geneve: { name: "Genève", country: "Suisse", lat: 46.2044, lng: 6.1432 },
};

const EUROPE = new Set(["France", "Belgique", "Espagne", "Italie", "Portugal", "Roumanie", "Pologne", "Royaume-Uni", "Allemagne", "Suisse"]);

type Mode = "PLANE" | "TRAIN" | "CAR" | "BUS" | "FERRY" | "VAN";

// 50 liaisons : [départ, arrivée, mode]. Avions pour l'international, ferry pour les traversées
// de Méditerranée au départ de Marseille (lignes qui existent réellement), train/voiture/bus en Europe.
// Répartition : Algérie 13, Maroc 5, Tunisie 3, Afrique subsaharienne 6, Europe sud/est + Turquie 8,
// Europe du nord 6, France 6, plus 3 liaisons Europe/Maghreb en sens inverse.
const ROUTES: [string, string, Mode][] = [
  // Algérie
  ["nantes", "alger", "PLANE"], ["paris", "alger", "PLANE"], ["marseille", "alger", "FERRY"], ["alger", "paris", "PLANE"],
  ["lyon", "oran", "PLANE"], ["oran", "marseille", "FERRY"], ["paris", "constantine", "PLANE"], ["bejaia", "lyon", "PLANE"],
  ["marseille", "bejaia", "FERRY"], ["toulouse", "setif", "PLANE"], ["paris", "tlemcen", "PLANE"], ["annaba", "paris", "PLANE"],
  ["paris", "oran", "PLANE"],
  // Maroc
  ["paris", "casablanca", "PLANE"], ["casablanca", "lyon", "PLANE"], ["marrakech", "nantes", "PLANE"], ["bruxelles", "tanger", "PLANE"],
  ["marseille", "fes", "PLANE"],
  // Tunisie
  ["paris", "tunis", "PLANE"], ["marseille", "tunis", "FERRY"], ["sousse", "paris", "PLANE"],
  // Afrique de l'Ouest et centrale
  ["paris", "dakar", "PLANE"], ["dakar", "paris", "PLANE"], ["paris", "abidjan", "PLANE"], ["abidjan", "bruxelles", "PLANE"],
  ["paris", "bamako", "PLANE"], ["paris", "douala", "PLANE"],
  // Turquie, Europe du sud et de l'est
  ["paris", "istanbul", "PLANE"], ["bordeaux", "lisbonne", "PLANE"], ["porto", "paris", "PLANE"], ["paris", "madrid", "PLANE"],
  ["marseille", "barcelone", "BUS"], ["nice", "rome", "PLANE"], ["paris", "bucarest", "PLANE"], ["varsovie", "paris", "PLANE"],
  // Europe du nord et de l'ouest
  ["paris", "bruxelles", "TRAIN"], ["lille", "bruxelles", "CAR"], ["londres", "paris", "TRAIN"], ["strasbourg", "francfort", "CAR"],
  ["geneve", "lyon", "CAR"], ["paris", "berlin", "PLANE"],
  // France (uniquement des liaisons où un colis a un intérêt)
  ["paris", "lyon", "TRAIN"], ["paris", "marseille", "TRAIN"], ["lille", "paris", "TRAIN"], ["bordeaux", "paris", "TRAIN"],
  ["strasbourg", "paris", "TRAIN"], ["toulouse", "lyon", "CAR"],
  // Retours et liaisons croisées
  ["bruxelles", "casablanca", "PLANE"], ["lyon", "barcelone", "CAR"], ["rome", "paris", "PLANE"],
];

// `countries` = pays d'attache (famille, origine, voyages réguliers) : sert à attribuer les trajets/colis de façon crédible.
// « France » signifie que la personne circule aussi en France même.
const TRAVELERS = [
  { first: "Samir", last: "Belkacem", verified: true, countries: ["Algérie", "France"] },
  { first: "Inès", last: "Haddad", verified: true, countries: ["Algérie", "Tunisie"] },
  { first: "Mehdi", last: "Ouali", verified: false, countries: ["Algérie", "France"] },
  { first: "Leïla", last: "Meziane", verified: true, countries: ["Maroc", "France"] },
  { first: "Rayan", last: "Cherif", verified: false, countries: ["Tunisie", "Algérie"] },
  { first: "Camille", last: "Robin", verified: true, countries: ["Espagne", "Portugal", "Italie", "France"] },
  { first: "Nabil", last: "Saadi", verified: true, countries: ["Algérie", "Maroc"] },
  { first: "Chloé", last: "Martin", verified: false, countries: ["Belgique", "Royaume-Uni", "France"] },
  { first: "Aminata", last: "Diallo", verified: true, countries: ["Sénégal", "Mali"] },
  { first: "Yao", last: "Kouassi", verified: true, countries: ["Côte d'Ivoire", "Cameroun"] },
  { first: "Emre", last: "Kaya", verified: true, countries: ["Turquie", "Allemagne"] },
  { first: "Joana", last: "Ferreira", verified: true, countries: ["Portugal", "Espagne"] },
  { first: "Andrei", last: "Popescu", verified: false, countries: ["Roumanie", "Pologne"] },
  { first: "Youssef", last: "El Idrissi", verified: true, countries: ["Maroc", "Belgique"] },
  { first: "Lucie", last: "Fontaine", verified: true, countries: ["Suisse", "Allemagne", "Belgique", "France"] },
];

const SENDERS = [
  { first: "Nadia", last: "Kaci", countries: ["Algérie"] },
  { first: "Omar", last: "Bensalem", countries: ["Algérie", "Tunisie"] },
  { first: "Sarah", last: "Lopez", countries: ["Espagne", "Portugal"] },
  { first: "Hugo", last: "Bernard", countries: ["France", "Belgique", "Suisse"] },
  { first: "Fatima", last: "Zerrouki", countries: ["Algérie", "Maroc"] },
  { first: "Lucas", last: "Petit", countries: ["France", "Italie", "Allemagne"] },
  { first: "Amel", last: "Boudiaf", countries: ["Algérie", "Tunisie"] },
  { first: "Thomas", last: "Girard", countries: ["France", "Royaume-Uni", "Pologne"] },
  { first: "Khadija", last: "Amrani", countries: ["Maroc", "Belgique"] },
  { first: "Ibrahima", last: "Ndiaye", countries: ["Sénégal", "Mali"] },
  { first: "Awa", last: "Traoré", countries: ["Côte d'Ivoire", "Mali", "Cameroun"] },
  { first: "Mihai", last: "Ionescu", countries: ["Roumanie", "Pologne"] },
  { first: "Elif", last: "Demir", countries: ["Turquie", "Allemagne"] },
  { first: "Marta", last: "Silva", countries: ["Portugal", "Espagne"] },
  { first: "Sonia", last: "Trabelsi", countries: ["Tunisie", "France"] },
];

// Voyageurs déjà présents dans la base de démo (voir README) : ils reçoivent aussi des trajets.
// Ils viennent APRÈS les nouveaux voyageurs dans la liste unifiée (index >= TRAVELERS.length).
const EXISTING_TRAVELERS = [
  { email: "karim.voyageur@demo.coliz", countries: ["Algérie"] },
  { email: "sofia.voyageur@demo.coliz", countries: ["Italie", "Espagne", "France"] },
  { email: "yanis.voyageur@demo.coliz", countries: ["Algérie", "Tunisie"] },
  { email: "nour.voyageur@demo.coliz", countries: ["Maroc", "Tunisie"] },
  { email: "amine.voyageur@demo.coliz", countries: ["Maroc", "Belgique"] },
  { email: "lina.voyageur@demo.coliz", countries: ["Algérie", "France"] },
];
export const EXISTING_TRAVELER_EMAILS = EXISTING_TRAVELERS.map((t) => t.email);

// Pays d'attache de chaque voyageur de la liste unifiée (nouveaux d'abord, puis existants).
const TRAVELER_COUNTRIES: string[][] = [...TRAVELERS.map((t) => t.countries), ...EXISTING_TRAVELERS.map((t) => t.countries)];

function slug(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function demoUsers() {
  return {
    travelers: TRAVELERS.map((t, i) => ({
      email: `${slug(t.first)}.voyageur@demo.coliz`,
      firstName: t.first,
      lastName: t.last,
      verified: t.verified,
      ratingCount: t.verified ? 4 + ((i * 7) % 20) : 0,
      ratingAverage: t.verified ? Math.round((4.2 + ((i * 3) % 8) / 10) * 10) / 10 : 0,
    })),
    senders: SENDERS.map((s) => ({
      email: `${slug(s.first)}.expediteur@demo.coliz`,
      firstName: s.first,
      lastName: s.last,
    })),
  };
}

// Générateur pseudo-aléatoire reproductible : relancer produit toujours les mêmes données.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function haversineKm(a: City, b: City) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(x));
}

const CAPACITY: Record<Mode, { w: number; l: number; wi: number; h: number; parcels: number }> = {
  PLANE: { w: 20, l: 80, wi: 50, h: 50, parcels: 2 },
  TRAIN: { w: 15, l: 70, wi: 45, h: 40, parcels: 2 },
  CAR: { w: 30, l: 100, wi: 60, h: 60, parcels: 3 },
  VAN: { w: 30, l: 100, wi: 60, h: 60, parcels: 3 },
  BUS: { w: 15, l: 70, wi: 45, h: 40, parcels: 2 },
  FERRY: { w: 25, l: 90, wi: 55, h: 55, parcels: 3 },
};

const SPEED_KMH: Record<Mode, number> = { PLANE: 700, TRAIN: 150, CAR: 85, VAN: 80, BUS: 65, FERRY: 33 };
const RATE_PER_KM: Record<Mode, number> = { PLANE: 0.04, TRAIN: 0.07, CAR: 0.05, VAN: 0.05, BUS: 0.04, FERRY: 0.06 };
const MIN_PRICE: Record<Mode, number> = { PLANE: 25, TRAIN: 8, CAR: 10, VAN: 10, BUS: 8, FERRY: 20 };
// Plafond : un long-courrier (Paris-Dakar, Paris-Douala) ne doit pas afficher des prix absurdes.
const MAX_PRICE: Record<Mode, number> = { PLANE: 120, TRAIN: 40, CAR: 50, VAN: 50, BUS: 45, FERRY: 70 };

function pickupLabel(mode: Mode, city: City) {
  switch (mode) {
    case "PLANE": return `Aéroport de ${city.name}`;
    case "TRAIN": return `Gare de ${city.name}`;
    case "BUS": return `Gare routière de ${city.name}`;
    case "FERRY": return `Port de ${city.name}`;
    default: return null;
  }
}

const label = (c: City) => `${c.name}, ${c.country}`;

export type BulkTrip = {
  travelerIndex: number; // index dans la liste unifiée de voyageurs
  originLabel: string; originLat: number; originLng: number;
  destinationLabel: string; destinationLat: number; destinationLng: number;
  departureAt: Date; arrivalAt: Date;
  mode: Mode;
  preexistingJourneyConfirmed: boolean;
  capacityWeightKg: number; capacityLengthCm: number; capacityWidthCm: number; capacityHeightCm: number;
  capacityParcels: number; remainingParcels: number;
  pickupPointLabel: string | null; dropoffPointLabel: string | null;
  contributionAmount: number;
  status: "PUBLISHED";
};

// Pays « étrangers » d'une liaison (ceux qui comptent pour choisir une personne) ; ["France"] si la liaison est 100 % française.
function foreignCountries(a: City, b: City) {
  const f = [a.country, b.country].filter((c) => c !== "France");
  return f.length ? Array.from(new Set(f)) : ["France"];
}

// Parmi les profils dont les pays d'attache recoupent la liaison, prend celui qui en couvre le plus,
// puis le moins sollicité (répartition équilibrée).
function pickProfile(countriesOfProfiles: string[][], wanted: string[], usage: number[], fallback: number) {
  let best = -1;
  let bestOverlap = 0;
  countriesOfProfiles.forEach((cs, idx) => {
    if (idx >= usage.length) return;
    const overlap = cs.filter((c) => wanted.includes(c)).length;
    if (overlap === 0) return;
    if (best === -1 || overlap > bestOverlap || (overlap === bestOverlap && usage[idx] < usage[best])) {
      best = idx;
      bestOverlap = overlap;
    }
  });
  return best === -1 ? fallback : best;
}

export function buildTrips(now: Date, travelerCount: number): BulkTrip[] {
  const rnd = mulberry32(20261001);
  const usage: number[] = new Array(travelerCount).fill(0);
  const hours: [number, number][] = [[6, 45], [8, 15], [9, 40], [11, 5], [13, 30], [15, 50], [18, 5], [19, 33], [21, 10]];
  return ROUTES.map(([from, to, mode], i) => {
    const a = C[from], b = C[to];
    const km = haversineKm(a, b);
    const cap = CAPACITY[mode];
    const [h, m] = hours[Math.floor(rnd() * hours.length)];
    // Départs répartis sur les 45 prochains jours (toujours dans le futur pour apparaître en recherche).
    const dep = new Date(now);
    dep.setUTCDate(dep.getUTCDate() + 2 + Math.floor((i * 45) / ROUTES.length) + Math.floor(rnd() * 3));
    dep.setUTCHours(h, m, 0, 0);
    const durationH = km / SPEED_KMH[mode] + (mode === "PLANE" ? 1.5 : 0.3);
    const arr = new Date(dep.getTime() + durationH * 3600 * 1000);
    const raw = Math.min(MAX_PRICE[mode], Math.max(MIN_PRICE[mode], km * RATE_PER_KM[mode]));
    const price = Math.round((raw * (0.9 + rnd() * 0.25)) / 0.5) * 0.5;
    const travelerIndex = pickProfile(TRAVELER_COUNTRIES, foreignCountries(a, b), usage, i % travelerCount);
    usage[travelerIndex]++;
    return {
      travelerIndex,
      originLabel: label(a), originLat: a.lat, originLng: a.lng,
      destinationLabel: label(b), destinationLat: b.lat, destinationLng: b.lng,
      departureAt: dep, arrivalAt: arr,
      mode,
      preexistingJourneyConfirmed: mode === "CAR" || mode === "VAN",
      capacityWeightKg: cap.w, capacityLengthCm: cap.l, capacityWidthCm: cap.wi, capacityHeightCm: cap.h,
      capacityParcels: cap.parcels, remainingParcels: cap.parcels,
      pickupPointLabel: pickupLabel(mode, a), dropoffPointLabel: pickupLabel(mode, b),
      contributionAmount: price,
      status: "PUBLISHED",
    };
  });
}

// Contenus de colis réalistes : poids/dimensions/valeur cohérents entre eux, selon le sens du trajet.
type Item = { kg: number; l: number; w: number; h: number; value: number };

// France/Europe -> pays hors Europe : ce qu'on envoie « au pays » (électronique, vêtements, cadeaux, pièces...).
const ITEMS_OUT: Item[] = [
  { kg: 1, l: 35, w: 25, h: 5, value: 20 },     // documents, dossiers administratifs
  { kg: 1, l: 25, w: 18, h: 10, value: 380 },   // smartphone
  { kg: 3, l: 40, w: 30, h: 10, value: 550 },   // ordinateur portable
  { kg: 3, l: 45, w: 35, h: 25, value: 80 },    // vêtements pour la famille
  { kg: 2, l: 35, w: 25, h: 15, value: 90 },    // chaussures
  { kg: 2, l: 30, w: 25, h: 20, value: 45 },    // cadeau
  { kg: 3, l: 40, w: 30, h: 25, value: 55 },    // jouets, livres
  { kg: 4, l: 40, w: 30, h: 20, value: 110 },   // cosmétiques, parfums
  { kg: 8, l: 55, w: 35, h: 25, value: 160 },   // pièces détachées (auto, électroménager)
  { kg: 6, l: 50, w: 35, h: 30, value: 120 },   // petit colis mixte
  { kg: 12, l: 60, w: 40, h: 40, value: 200 },  // gros colis
];

// Pays hors Europe -> France/Europe : ce qu'on ramène (produits du pays, artisanat, vêtements traditionnels).
const ITEMS_BACK: Item[] = [
  { kg: 1, l: 35, w: 25, h: 5, value: 20 },     // documents, courrier
  { kg: 4, l: 35, w: 25, h: 20, value: 40 },    // dattes, épices, thé (denrées sèches)
  { kg: 5, l: 40, w: 30, h: 30, value: 60 },    // produits du pays
  { kg: 5, l: 40, w: 30, h: 30, value: 55 },    // huile d'olive, huile d'argan (bouteilles emballées)
  { kg: 3, l: 45, w: 35, h: 20, value: 70 },    // artisanat, tissus, poterie
  { kg: 3, l: 45, w: 35, h: 20, value: 120 },   // vêtements traditionnels, robes
  { kg: 2, l: 30, w: 25, h: 20, value: 45 },    // cadeau
  { kg: 8, l: 55, w: 40, h: 35, value: 100 },   // colis mixte famille
];

// Liaisons entre pays européens et en France : usage quotidien (documents, cadeaux, e-commerce...).
const ITEMS_INTRA: Item[] = [
  { kg: 1, l: 35, w: 25, h: 5, value: 20 },     // documents
  { kg: 2, l: 30, w: 25, h: 20, value: 45 },    // cadeau
  { kg: 3, l: 45, w: 35, h: 25, value: 80 },    // vêtements
  { kg: 4, l: 40, w: 30, h: 15, value: 250 },   // électronique (tablette, console)
  { kg: 3, l: 40, w: 30, h: 25, value: 55 },    // livres, jeux
  { kg: 2, l: 35, w: 25, h: 15, value: 90 },    // chaussures
  { kg: 6, l: 50, w: 35, h: 30, value: 120 },   // colis mixte
  { kg: 8, l: 55, w: 40, h: 35, value: 150 },   // valise cabine partielle
];

function itemsFor(originCountry: string, destinationCountry: string): Item[] {
  if (!EUROPE.has(originCountry)) return ITEMS_BACK;
  if (!EUROPE.has(destinationCountry)) return ITEMS_OUT;
  return ITEMS_INTRA;
}

export type BulkParcel = {
  senderIndex: number;
  originLabel: string; originLat: number; originLng: number;
  destinationLabel: string; destinationLat: number; destinationLng: number;
  desiredDate: Date; dateFlexibleDays: number;
  weightKg: number; lengthCm: number; widthCm: number; heightCm: number;
  declaredValue: number;
};

// Colis volontairement SANS trajet correspondant (autre ville de départ/arrivée à plus de 80 km, ou sens inverse) :
// un site vivant a aussi des colis qui attendent un voyageur.
const ORPHAN_ROUTES: [string, string][] = [
  ["paris", "setif"], ["lyon", "tizi"], ["rennes", "alger"], ["nice", "casablanca"], ["toulouse", "istanbul"], ["strasbourg", "tunis"],
  ["lille", "dakar"], ["bordeaux", "alger"], ["montpellier", "oran"], ["paris", "porto"], ["lyon", "londres"], ["nantes", "abidjan"],
];

// 38 colis suivent la route d'un trajet (une route différente par colis, date proche du départ, gabarit compatible),
// 12 colis n'ont aucun trajet. Chaque expéditeur est choisi parmi ceux qui connaissent le pays de la liaison.
export function buildParcels(trips: BulkTrip[], senderCount: number): BulkParcel[] {
  const rnd = mulberry32(7331);
  const out: BulkParcel[] = [];
  const usage: number[] = new Array(senderCount).fill(0);
  const senderCountries = SENDERS.map((s) => s.countries);
  const firstDeparture = Math.min(...trips.map((t) => t.departureAt.getTime()));
  let matched = 0;
  let orphan = 0;

  for (let k = 0; k < 50; k++) {
    const isOrphan = k % 4 === 3; // 12 colis sans trajet, répartis dans la liste
    let route: { o: City; d: City; oLabel: string; dLabel: string };
    let date: Date;
    let flexible: number;
    let capacity: { w: number; l: number; wi: number; h: number } | null = null;

    if (isOrphan) {
      const [from, to] = ORPHAN_ROUTES[orphan++ % ORPHAN_ROUTES.length];
      const o = C[from], d = C[to];
      route = { o, d, oLabel: label(o), dLabel: label(d) };
      date = new Date(firstDeparture);
      date.setUTCDate(date.getUTCDate() + 3 + Math.floor(rnd() * 40));
      flexible = Math.floor(rnd() * 3);
    } else {
      const trip = trips[(matched++ * 7) % trips.length];
      const [oc, dc] = [trip.originLabel.split(", ").pop()!, trip.destinationLabel.split(", ").pop()!];
      route = {
        o: { name: trip.originLabel, country: oc, lat: trip.originLat, lng: trip.originLng },
        d: { name: trip.destinationLabel, country: dc, lat: trip.destinationLat, lng: trip.destinationLng },
        oLabel: trip.originLabel, dLabel: trip.destinationLabel,
      };
      date = new Date(trip.departureAt);
      date.setUTCDate(date.getUTCDate() + Math.floor(rnd() * 3) - 1);
      date.setUTCHours(0, 0, 0, 0);
      // La flexibilité couvre toujours l'écart réel entre la date souhaitée et le départ : le trajet d'origine est trouvé.
      const gapDays = Math.abs(trip.departureAt.getTime() - date.getTime()) / 86400000;
      flexible = Math.max(Math.floor(rnd() * 4), Math.ceil(gapDays));
      capacity = { w: trip.capacityWeightKg, l: trip.capacityLengthCm, wi: trip.capacityWidthCm, h: trip.capacityHeightCm };
    }
    date.setUTCHours(0, 0, 0, 0);

    const catalog = itemsFor(route.o.country, route.d.country);
    const fitting = capacity
      ? catalog.filter((it) => it.kg <= capacity!.w && it.l <= capacity!.l && it.w <= capacity!.wi && it.h <= capacity!.h)
      : catalog;
    const it = fitting[Math.floor(rnd() * fitting.length)];

    const senderIndex = pickProfile(senderCountries, foreignCountries(route.o, route.d), usage, k % senderCount);
    usage[senderIndex]++;

    out.push({
      senderIndex,
      originLabel: route.oLabel, originLat: route.o.lat, originLng: route.o.lng,
      destinationLabel: route.dLabel, destinationLat: route.d.lat, destinationLng: route.d.lng,
      desiredDate: date,
      dateFlexibleDays: flexible,
      weightKg: it.kg, lengthCm: it.l, widthCm: it.w, heightCm: it.h,
      declaredValue: Math.round(it.value * (0.8 + rnd() * 0.5)),
    });
  }
  return out;
}

export { computeBookingAmounts };

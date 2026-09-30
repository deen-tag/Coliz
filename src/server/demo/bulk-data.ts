// Données de démonstration : 50 trajets + 50 colis cohérents (fonctions pures, sans base de données).
// Tous les comptes créés se terminent par @demo.coliz (purge facile).

import { computeBookingAmounts } from "../pricing";

type City = { name: string; country: string; lat: number; lng: number };

const C: Record<string, City> = {
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
  vannes: { name: "Vannes", country: "France", lat: 47.6582, lng: -2.7608 },
  montpellier: { name: "Montpellier", country: "France", lat: 43.6108, lng: 3.8767 },
  alger: { name: "Alger", country: "Algérie", lat: 36.7538, lng: 3.0588 },
  oran: { name: "Oran", country: "Algérie", lat: 35.6971, lng: -0.6308 },
  constantine: { name: "Constantine", country: "Algérie", lat: 36.365, lng: 6.6147 },
  bejaia: { name: "Béjaïa", country: "Algérie", lat: 36.7509, lng: 5.0567 },
  annaba: { name: "Annaba", country: "Algérie", lat: 36.9, lng: 7.7667 },
  tlemcen: { name: "Tlemcen", country: "Algérie", lat: 34.8783, lng: -1.315 },
  casablanca: { name: "Casablanca", country: "Maroc", lat: 33.5731, lng: -7.5898 },
  marrakech: { name: "Marrakech", country: "Maroc", lat: 31.6295, lng: -7.9811 },
  rabat: { name: "Rabat", country: "Maroc", lat: 34.0209, lng: -6.8416 },
  tanger: { name: "Tanger", country: "Maroc", lat: 35.7595, lng: -5.834 },
  tunis: { name: "Tunis", country: "Tunisie", lat: 36.8065, lng: 10.1815 },
  sfax: { name: "Sfax", country: "Tunisie", lat: 34.7406, lng: 10.7603 },
  bruxelles: { name: "Bruxelles", country: "Belgique", lat: 50.8503, lng: 4.3517 },
  madrid: { name: "Madrid", country: "Espagne", lat: 40.4168, lng: -3.7038 },
  barcelone: { name: "Barcelone", country: "Espagne", lat: 41.3874, lng: 2.1686 },
  rome: { name: "Rome", country: "Italie", lat: 41.9028, lng: 12.4964 },
  lisbonne: { name: "Lisbonne", country: "Portugal", lat: 38.7223, lng: -9.1393 },
  dakar: { name: "Dakar", country: "Sénégal", lat: 14.7167, lng: -17.4677 },
  istanbul: { name: "Istanbul", country: "Turquie", lat: 41.0082, lng: 28.9784 },
};

type Mode = "PLANE" | "TRAIN" | "CAR" | "BUS" | "FERRY" | "VAN";

// 50 liaisons : [départ, arrivée, mode]. Avions pour l'international, train/voiture/bus en France et en Europe,
// ferry pour les traversées de Méditerranée.
const ROUTES: [string, string, Mode][] = [
  ["nantes", "alger", "PLANE"], ["paris", "alger", "PLANE"], ["marseille", "alger", "FERRY"], ["lyon", "alger", "PLANE"],
  ["alger", "paris", "PLANE"], ["alger", "lyon", "PLANE"], ["alger", "marseille", "FERRY"], ["oran", "marseille", "FERRY"],
  ["marseille", "oran", "FERRY"], ["paris", "oran", "PLANE"], ["oran", "paris", "PLANE"], ["bordeaux", "oran", "PLANE"],
  ["paris", "constantine", "PLANE"], ["constantine", "lyon", "PLANE"], ["lyon", "bejaia", "PLANE"], ["vannes", "bejaia", "PLANE"],
  ["marseille", "annaba", "FERRY"], ["toulouse", "alger", "PLANE"], ["paris", "tlemcen", "PLANE"], ["nice", "alger", "PLANE"],
  ["paris", "casablanca", "PLANE"], ["casablanca", "lyon", "PLANE"], ["marrakech", "nantes", "PLANE"], ["marseille", "tanger", "FERRY"],
  ["bordeaux", "rabat", "PLANE"], ["casablanca", "paris", "PLANE"], ["paris", "tunis", "PLANE"], ["marseille", "tunis", "FERRY"],
  ["tunis", "lyon", "PLANE"], ["nice", "sfax", "PLANE"], ["paris", "lyon", "TRAIN"], ["lyon", "paris", "TRAIN"],
  ["paris", "marseille", "TRAIN"], ["paris", "lille", "TRAIN"], ["lille", "paris", "TRAIN"], ["paris", "bordeaux", "TRAIN"],
  ["nantes", "paris", "TRAIN"], ["rennes", "lyon", "CAR"], ["toulouse", "montpellier", "CAR"], ["strasbourg", "paris", "TRAIN"],
  ["nantes", "vannes", "BUS"], ["lyon", "nice", "CAR"], ["paris", "bruxelles", "TRAIN"], ["lille", "bruxelles", "CAR"],
  ["paris", "madrid", "PLANE"], ["marseille", "barcelone", "BUS"], ["nice", "rome", "PLANE"], ["bordeaux", "lisbonne", "PLANE"],
  ["paris", "dakar", "PLANE"], ["paris", "istanbul", "PLANE"],
];

const TRAVELERS = [
  { first: "Samir", last: "Belkacem", verified: true },
  { first: "Inès", last: "Haddad", verified: true },
  { first: "Mehdi", last: "Ouali", verified: false },
  { first: "Leïla", last: "Meziane", verified: true },
  { first: "Rayan", last: "Cherif", verified: false },
  { first: "Camille", last: "Robin", verified: true },
  { first: "Nabil", last: "Saadi", verified: true },
  { first: "Chloé", last: "Martin", verified: false },
];

const SENDERS = [
  { first: "Nadia", last: "Kaci" },
  { first: "Omar", last: "Bensalem" },
  { first: "Sarah", last: "Lopez" },
  { first: "Hugo", last: "Bernard" },
  { first: "Fatima", last: "Zerrouki" },
  { first: "Lucas", last: "Petit" },
  { first: "Amel", last: "Boudiaf" },
  { first: "Thomas", last: "Girard" },
];

// Voyageurs déjà présents dans la base de démo (voir README) : ils reçoivent aussi des trajets.
export const EXISTING_TRAVELER_EMAILS = [
  "karim.voyageur@demo.coliz",
  "sofia.voyageur@demo.coliz",
  "yanis.voyageur@demo.coliz",
  "nour.voyageur@demo.coliz",
  "amine.voyageur@demo.coliz",
  "lina.voyageur@demo.coliz",
];

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
const RATE_PER_KM: Record<Mode, number> = { PLANE: 0.05, TRAIN: 0.07, CAR: 0.05, VAN: 0.05, BUS: 0.04, FERRY: 0.06 };
const MIN_PRICE: Record<Mode, number> = { PLANE: 25, TRAIN: 8, CAR: 10, VAN: 10, BUS: 8, FERRY: 20 };

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

export function buildTrips(now: Date, travelerCount: number): BulkTrip[] {
  const rnd = mulberry32(20261001);
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
    const raw = Math.max(MIN_PRICE[mode], km * RATE_PER_KM[mode]);
    const price = Math.round((raw * (0.9 + rnd() * 0.25)) / 0.5) * 0.5;
    return {
      travelerIndex: i % travelerCount,
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

// Contenus de colis réalistes : poids/dimensions/valeur cohérents entre eux.
const ITEMS: { kg: number; l: number; w: number; h: number; value: number }[] = [
  { kg: 1, l: 35, w: 25, h: 5, value: 20 },    // documents, courrier
  { kg: 2, l: 30, w: 25, h: 20, value: 45 },   // cadeau
  { kg: 3, l: 45, w: 35, h: 25, value: 80 },   // vêtements
  { kg: 4, l: 40, w: 30, h: 15, value: 250 },  // électronique (téléphone, tablette)
  { kg: 5, l: 40, w: 30, h: 30, value: 60 },   // produits du pays, épices, douceurs
  { kg: 2, l: 35, w: 25, h: 15, value: 90 },   // chaussures
  { kg: 3, l: 40, w: 30, h: 25, value: 55 },   // jouets, livres
  { kg: 6, l: 50, w: 35, h: 30, value: 120 },  // petit colis mixte
  { kg: 8, l: 55, w: 40, h: 35, value: 150 },  // valise cabine partielle
  { kg: 12, l: 60, w: 40, h: 40, value: 200 }, // gros colis
];

export type BulkParcel = {
  senderIndex: number;
  originLabel: string; originLat: number; originLng: number;
  destinationLabel: string; destinationLat: number; destinationLng: number;
  desiredDate: Date; dateFlexibleDays: number;
  weightKg: number; lengthCm: number; widthCm: number; heightCm: number;
  declaredValue: number;
};

// Chaque colis suit la route d'un trajet (une route différente par colis) avec une date proche du départ,
// et rentre dans la capacité du trajet : la recherche trouve donc toujours au moins un résultat.
export function buildParcels(trips: BulkTrip[], senderCount: number): BulkParcel[] {
  const rnd = mulberry32(7331);
  const out: BulkParcel[] = [];
  for (let k = 0; k < 50; k++) {
    const trip = trips[(k * 7) % trips.length];
    const fitting = ITEMS.filter(
      (it) => it.kg <= trip.capacityWeightKg && it.l <= trip.capacityLengthCm && it.w <= trip.capacityWidthCm && it.h <= trip.capacityHeightCm
    );
    const it = fitting[Math.floor(rnd() * fitting.length)];
    const date = new Date(trip.departureAt);
    date.setUTCDate(date.getUTCDate() + Math.floor(rnd() * 3) - 1);
    date.setUTCHours(0, 0, 0, 0);
    out.push({
      senderIndex: k % senderCount,
      originLabel: trip.originLabel, originLat: trip.originLat, originLng: trip.originLng,
      destinationLabel: trip.destinationLabel, destinationLat: trip.destinationLat, destinationLng: trip.destinationLng,
      desiredDate: date,
      dateFlexibleDays: Math.floor(rnd() * 4),
      weightKg: it.kg, lengthCm: it.l, widthCm: it.w, heightCm: it.h,
      declaredValue: Math.round(it.value * (0.8 + rnd() * 0.5)),
    });
  }
  return out;
}

export { computeBookingAmounts };

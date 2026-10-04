import { prisma } from "@/lib/prisma";
import type { Parcel, TransportMode } from "@prisma/client";
import { haversineKm, fitsDimensions, computeMatchScore } from "./geo";

export interface MatchFilters {
  transportModes?: TransportMode[];
  maxDistanceFromOriginKm?: number;
  maxDistanceFromDestinationKm?: number;
  maxContribution?: number;
  sortBy?: "best_match" | "date" | "contribution" | "rating";
}

export interface MatchResult {
  tripId: string;
  travelerId: string;
  score: number;
  distanceOriginKm: number;
  distanceDestinationKm: number;
}

/**
 * Retourne les trajets compatibles avec un colis, triés selon le critère demandé.
 * Le colis n'a pas de date : seules comptent les villes (proximité), le poids, les dimensions et les
 * places restantes. Tous les trajets à venir qui correspondent s'affichent, quel que soit leur jour.
 * Par défaut (best_match), les départs les plus proches dans le temps sont en premier.
 */
export async function findMatchingTrips(parcel: Parcel, filters: MatchFilters = {}) {
  const candidates = await prisma.trip.findMany({
    where: {
      status: { in: ["PUBLISHED", "PARTIALLY_BOOKED"] },
      departureAt: { gte: new Date() }, // seulement les trajets à venir
      remainingParcels: { gte: parcel.parcelCount },
      capacityWeightKg: { gte: parcel.weightKg },
      ...(filters.transportModes ? { mode: { in: filters.transportModes } } : {}),
    },
    include: { traveler: true },
  });

  const results: (MatchResult & { trip: (typeof candidates)[number] })[] = candidates
    .map((trip) => {
      const distanceOriginKm = haversineKm(parcel.originLat, parcel.originLng, trip.originLat, trip.originLng);
      const distanceDestinationKm = haversineKm(
        parcel.destinationLat,
        parcel.destinationLng,
        trip.destinationLat,
        trip.destinationLng
      );
      // Dimensions : on vérifie que le colis rentre dans la capacité déclarée (ordre simple, sans rotation 3D)
      const fits = fitsDimensions(parcel, trip);

      // Tolérance de proximité par défaut, pondérée par le mode du trajet
      // (un trajet en avion/train/bus/ferry suppose un point de RDV autour
      // d'un hub, donc un rayon plus large qu'en voiture/moto/vélo) — sans
      // quoi un trajet à l'autre bout du pays remontait dès lors que les
      // dates et la capacité correspondaient. Un filtre explicite fourni par
      // l'appelant reste toujours prioritaire.
      const defaultRadiusKm = proximityRadiusKm(trip.mode);
      const maxOrigin = filters.maxDistanceFromOriginKm ?? defaultRadiusKm;
      const maxDestination = filters.maxDistanceFromDestinationKm ?? defaultRadiusKm;

      if (!fits) return null;
      if (distanceOriginKm > maxOrigin) return null;
      if (distanceDestinationKm > maxDestination) return null;
      if (filters.maxContribution && Number(trip.contributionAmount) > filters.maxContribution) return null;

      // Score : plus c'est bas, mieux c'est (distance en km)
      const score = computeMatchScore(distanceOriginKm, distanceDestinationKm);

      return { tripId: trip.id, travelerId: trip.travelerId, score, distanceOriginKm, distanceDestinationKm, trip };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const sortBy = filters.sortBy ?? "best_match";
  results.sort((a, b) => {
    switch (sortBy) {
      case "date":
        return a.trip.departureAt.getTime() - b.trip.departureAt.getTime();
      case "contribution":
        return Number(a.trip.contributionAmount) - Number(b.trip.contributionAmount);
      case "rating":
        return b.trip.traveler.ratingAverage - a.trip.traveler.ratingAverage;
      default:
        // best_match : départ le plus proche dans le temps d'abord, puis le plus proche des villes
        return a.trip.departureAt.getTime() - b.trip.departureAt.getTime() || a.score - b.score;
    }
  });

  return results;
}

// Rayon de tolérance origine/destination selon le mode — amélioration
// pragmatique demandée : un trajet en avion/train/bus/ferry suppose un point
// de rendez-vous autour d'un hub (aéroport, gare, port), donc une tolérance
// plus large qu'un trajet en voiture/moto/vélo où le point de RDV est le
// trajet lui-même. Pas de base de données aéroports/gares : un rayon fixe
// par catégorie, volontairement simple (brief : "pas de moteur multimodal").
function proximityRadiusKm(mode: TransportMode) {
  switch (mode) {
    case "PLANE":
    case "TRAIN":
    case "BUS":
    case "FERRY":
      return 80;
    default: // CAR, VAN, MOTORCYCLE, BICYCLE, OTHER
      return 25;
  }
}

type TripLike = {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  departureAt: Date;
  mode: TransportMode;
  capacityWeightKg: number;
  capacityLengthCm: number;
  capacityWidthCm: number;
  capacityHeightCm: number;
  remainingParcels: number;
};

// Colis ouverts potentiellement compatibles avec un trajet donné — utilisé
// par "Mes voyages" ("N opportunités compatibles", brief UI/UX §22) et par
// la notification automatique à la publication d'un trajet. Volontairement
// simple : réutilise les mêmes critères de faisabilité que
// findMatchingTrips (gabarit, proximité géographique pondérée par mode ; pas de date), sans dupliquer un moteur de recherche
// inverse complet.
export async function findCompatibleParcels(trip: TripLike): Promise<Parcel[]> {
  if (trip.remainingParcels < 1) return [];

  const openParcels = await prisma.parcel.findMany({
    where: { status: { in: ["SEARCHING", "MATCHED"] } },
  });

  const radiusKm = proximityRadiusKm(trip.mode);

  return openParcels.filter((parcel) => {
    if (parcel.parcelCount > trip.remainingParcels) return false;
    if (parcel.weightKg > trip.capacityWeightKg) return false;
    if (!fitsDimensions(parcel, trip)) return false;

    const distanceOrigin = haversineKm(parcel.originLat, parcel.originLng, trip.originLat, trip.originLng);
    const distanceDestination = haversineKm(
      parcel.destinationLat,
      parcel.destinationLng,
      trip.destinationLat,
      trip.destinationLng
    );
    return distanceOrigin <= radiusKm && distanceDestination <= radiusKm;
  });
}

export async function countCompatibleParcels(trip: TripLike) {
  return (await findCompatibleParcels(trip)).length;
}

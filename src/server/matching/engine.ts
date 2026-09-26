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
  daysFromDesiredDate: number;
}

/**
 * Retourne les trajets compatibles avec un colis, triés selon le critère demandé.
 * Le score "best_match" combine proximité géographique et proximité de date —
 * les deux critères objectifs les plus déterminants pour l'utilisateur.
 */
export async function findMatchingTrips(parcel: Parcel, filters: MatchFilters = {}) {
  const dateFrom = new Date(parcel.desiredDate);
  dateFrom.setDate(dateFrom.getDate() - parcel.dateFlexibleDays);
  const dateTo = new Date(parcel.desiredDate);
  dateTo.setDate(dateTo.getDate() + parcel.dateFlexibleDays);

  const candidates = await prisma.trip.findMany({
    where: {
      status: { in: ["PUBLISHED", "PARTIALLY_BOOKED"] },
      departureAt: { gte: dateFrom, lte: dateTo },
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
      const daysFromDesiredDate = Math.abs(
        (trip.departureAt.getTime() - parcel.desiredDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Dimensions : on vérifie que le colis rentre dans la capacité déclarée (ordre simple, sans rotation 3D)
      const fits = fitsDimensions(parcel, trip);

      if (!fits) return null;
      if (filters.maxDistanceFromOriginKm && distanceOriginKm > filters.maxDistanceFromOriginKm) return null;
      if (filters.maxDistanceFromDestinationKm && distanceDestinationKm > filters.maxDistanceFromDestinationKm)
        return null;
      if (filters.maxContribution && Number(trip.contributionAmount) > filters.maxContribution) return null;

      // Score : plus c'est bas, mieux c'est (distance en km + pénalité de jours d'écart)
      const score = computeMatchScore(distanceOriginKm, distanceDestinationKm, daysFromDesiredDate);

      return { tripId: trip.id, travelerId: trip.travelerId, score, distanceOriginKm, distanceDestinationKm, daysFromDesiredDate, trip };
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
        return a.score - b.score;
    }
  });

  return results;
}

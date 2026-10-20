import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fitsRemainingWeight, isWeightFull, roundKg } from "./weight";

type Tx = Prisma.TransactionClient;

/**
 * Comptabilité de la capacité d'un trajet.
 *
 * Deux modes, selon le trajet :
 * - en kilos (Trip.remainingWeightKg renseigné, trajets récents) : chaque réservation retire le poids
 *   de son colis ; le trajet est complet quand il ne reste plus rien. Pas de limite en nombre de colis.
 * - au nombre de colis (anciens trajets, Trip.remainingParcels) : une place par colis.
 *
 * Dans les deux cas :
 * - la capacité est réservée dès la création de la demande (REQUESTED), pour qu'une deuxième demande
 *   simultanée ne puisse pas la dépasser ;
 * - elle est restituée quand la réservation passe à CANCELLED, quel que soit le chemin : refus du
 *   voyageur, annulation, remboursement Stripe.
 */

// Réserve la capacité nécessaire à un colis. Atomique : la condition de capacité est évaluée par la base
// dans la même requête que la décrémentation (pas de course possible entre deux demandes). Retourne false
// si le trajet n'a plus la place ou n'est plus ouvert.
export async function reserveCapacity(tx: Tx, tripId: string, count: number, weightKg: number): Promise<boolean> {
  const trip = await tx.trip.findUnique({ where: { id: tripId }, select: { remainingWeightKg: true } });
  if (!trip) return false;
  const open = { id: tripId, status: { in: ["PUBLISHED", "PARTIALLY_BOOKED"] as ("PUBLISHED" | "PARTIALLY_BOOKED")[] } };

  if (trip.remainingWeightKg !== null) {
    const kg = roundKg(weightKg);
    if (!(kg > 0)) return false;
    const res = await tx.trip.updateMany({
      where: { ...open, remainingWeightKg: { gte: kg } },
      data: { remainingWeightKg: { decrement: kg } },
    });
    if (res.count === 0) return false;
    const after = await tx.trip.findUniqueOrThrow({ where: { id: tripId }, select: { remainingWeightKg: true } });
    const left = roundKg(after.remainingWeightKg ?? 0);
    const full = isWeightFull(left);
    await tx.trip.update({
      where: { id: tripId },
      data: { remainingWeightKg: left, remainingParcels: full ? 0 : 1, status: full ? "FULLY_BOOKED" : "PARTIALLY_BOOKED" },
    });
    return true;
  }

  const res = await tx.trip.updateMany({
    where: { ...open, remainingParcels: { gte: count } },
    data: { remainingParcels: { decrement: count } },
  });
  if (res.count === 0) return false;

  const after = await tx.trip.findUniqueOrThrow({ where: { id: tripId }, select: { remainingParcels: true } });
  await tx.trip.update({
    where: { id: tripId },
    data: { status: after.remainingParcels <= 0 ? "FULLY_BOOKED" : "PARTIALLY_BOOKED" },
  });
  return true;
}

// Le colis tient-il encore sur ce trajet ? (contrôle rapide avant la réservation atomique)
export function tripHasRoomFor(
  trip: { remainingParcels: number; remainingWeightKg: number | null },
  parcel: { parcelCount: number; weightKg: number }
) {
  if (trip.remainingWeightKg !== null) return fitsRemainingWeight(parcel.weightKg, trip.remainingWeightKg);
  return trip.remainingParcels >= parcel.parcelCount;
}

// Restitue la capacité d'un colis, sans jamais dépasser la capacité déclarée (protège aussi les anciennes
// réservations créées avant l'introduction de ces compteurs). Ne touche pas un trajet déjà parti,
// terminé, annulé ou archivé.
export async function releaseCapacity(tx: Tx, tripId: string, count: number, weightKg: number) {
  const trip = await tx.trip.findUnique({ where: { id: tripId } });
  if (!trip) return;
  if (!["PUBLISHED", "PARTIALLY_BOOKED", "FULLY_BOOKED"].includes(trip.status)) return;

  if (trip.remainingWeightKg !== null) {
    const left = Math.min(roundKg(trip.capacityWeightKg), roundKg(trip.remainingWeightKg + weightKg));
    const untouched = roundKg(left) >= roundKg(trip.capacityWeightKg);
    await tx.trip.update({
      where: { id: tripId },
      data: { remainingWeightKg: left, remainingParcels: 1, status: untouched ? "PUBLISHED" : "PARTIALLY_BOOKED" },
    });
    return;
  }

  const remaining = Math.min(trip.capacityParcels, trip.remainingParcels + count);
  await tx.trip.update({
    where: { id: tripId },
    data: {
      remainingParcels: remaining,
      status: remaining >= trip.capacityParcels ? "PUBLISHED" : "PARTIALLY_BOOKED",
    },
  });
}

// Passe la réservation à CANCELLED et restitue sa capacité — une seule fois :
// si elle est déjà annulée (ex. webhook Stripe rejoué), ne fait rien.
export async function cancelBookingTx(tx: Tx, bookingId: string): Promise<boolean> {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: { parcel: { select: { parcelCount: true, weightKg: true } } },
  });
  if (!booking || booking.status === "CANCELLED") return false;

  await tx.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
  await releaseCapacity(tx, booking.tripId, booking.parcel.parcelCount, booking.parcel.weightKg);
  return true;
}

export function cancelBooking(bookingId: string) {
  return prisma.$transaction((tx) => cancelBookingTx(tx, bookingId));
}

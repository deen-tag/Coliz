import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

/**
 * Comptabilité des places d'un trajet (Trip.remainingParcels).
 *
 * - Une place est réservée dès la création de la demande (REQUESTED), pour
 *   qu'une deuxième demande simultanée ne puisse pas dépasser la capacité.
 * - Elle est restituée quand la réservation passe à CANCELLED, quel que soit
 *   le chemin : refus du voyageur, annulation, remboursement Stripe.
 */

// Réserve `count` places. Atomique : la condition de capacité est évaluée par
// la base dans la même requête que la décrémentation (pas de course possible
// entre deux demandes). Retourne false si le trajet n'a plus la place ou
// n'est plus ouvert.
export async function reserveCapacity(tx: Tx, tripId: string, count: number): Promise<boolean> {
  const res = await tx.trip.updateMany({
    where: {
      id: tripId,
      status: { in: ["PUBLISHED", "PARTIALLY_BOOKED"] },
      remainingParcels: { gte: count },
    },
    data: { remainingParcels: { decrement: count } },
  });
  if (res.count === 0) return false;

  const trip = await tx.trip.findUniqueOrThrow({ where: { id: tripId }, select: { remainingParcels: true } });
  await tx.trip.update({
    where: { id: tripId },
    data: { status: trip.remainingParcels <= 0 ? "FULLY_BOOKED" : "PARTIALLY_BOOKED" },
  });
  return true;
}

// Restitue `count` places, sans jamais dépasser la capacité déclarée (protège
// aussi les anciennes réservations créées avant l'introduction de ce compteur).
// Ne touche pas un trajet déjà parti, terminé, annulé ou archivé.
export async function releaseCapacity(tx: Tx, tripId: string, count: number) {
  const trip = await tx.trip.findUnique({ where: { id: tripId } });
  if (!trip) return;
  if (!["PUBLISHED", "PARTIALLY_BOOKED", "FULLY_BOOKED"].includes(trip.status)) return;

  const remaining = Math.min(trip.capacityParcels, trip.remainingParcels + count);
  await tx.trip.update({
    where: { id: tripId },
    data: {
      remainingParcels: remaining,
      status: remaining >= trip.capacityParcels ? "PUBLISHED" : "PARTIALLY_BOOKED",
    },
  });
}

// Passe la réservation à CANCELLED et restitue ses places — une seule fois :
// si elle est déjà annulée (ex. webhook Stripe rejoué), ne fait rien.
export async function cancelBookingTx(tx: Tx, bookingId: string): Promise<boolean> {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: { parcel: { select: { parcelCount: true } } },
  });
  if (!booking || booking.status === "CANCELLED") return false;

  await tx.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
  await releaseCapacity(tx, booking.tripId, booking.parcel.parcelCount);
  return true;
}

export function cancelBooking(bookingId: string) {
  return prisma.$transaction((tx) => cancelBookingTx(tx, bookingId));
}

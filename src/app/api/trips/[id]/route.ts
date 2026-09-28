import { NextResponse } from "next/server";
import { displayPrice } from "@/server/pricing";
import { prisma } from "@/lib/prisma";

// Public — consultable avant connexion, comme /recherche déjà accessible en
// mode "aperçu". Aucune donnée de contact n'est exposée (cf. messagerie/booking
// pour entrer en relation).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      traveler: {
        select: { id: true, firstName: true, avatarUrl: true, ratingAverage: true, ratingCount: true, identityVerifiedAt: true },
      },
    },
  });
  if (!trip) return NextResponse.json({ error: "Trajet introuvable" }, { status: 404 });

  return NextResponse.json({
    id: trip.id,
    status: trip.status,
    mode: trip.mode,
    originLabel: trip.originLabel,
    originLat: trip.originLat,
    originLng: trip.originLng,
    destinationLabel: trip.destinationLabel,
    destinationLat: trip.destinationLat,
    destinationLng: trip.destinationLng,
    pickupPointLabel: trip.pickupPointLabel,
    dropoffPointLabel: trip.dropoffPointLabel,
    departureAt: trip.departureAt,
    arrivalAt: trip.arrivalAt,
    contributionAmount: trip.contributionAmount,
    totalAmount: displayPrice(trip.contributionAmount),
    remainingParcels: trip.remainingParcels,
    capacityWeightKg: trip.capacityWeightKg,
    capacityLengthCm: trip.capacityLengthCm,
    capacityWidthCm: trip.capacityWidthCm,
    capacityHeightCm: trip.capacityHeightCm,
    traveler: {
      id: trip.traveler.id,
      firstName: trip.traveler.firstName,
      avatarUrl: trip.traveler.avatarUrl,
      ratingAverage: trip.traveler.ratingAverage,
      ratingCount: trip.traveler.ratingCount,
      identityVerified: Boolean(trip.traveler.identityVerifiedAt),
    },
  });
}

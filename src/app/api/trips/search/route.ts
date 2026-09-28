import { NextResponse } from "next/server";
import { displayPrice } from "@/server/pricing";
import { prisma } from "@/lib/prisma";
import { findMatchingTrips } from "@/server/matching/engine";
import { requireUser } from "@/server/auth/session";

export async function GET(req: Request) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const parcelId = searchParams.get("parcelId");
  if (!parcelId) {
    return NextResponse.json({ error: "parcelId requis" }, { status: 400 });
  }

  const parcel = await prisma.parcel.findUnique({ where: { id: parcelId } });
  if (!parcel) {
    return NextResponse.json({ error: "Colis introuvable" }, { status: 404 });
  }

  const sortBy = (searchParams.get("sortBy") as any) ?? "best_match";
  const results = await findMatchingTrips(parcel, { sortBy });

  return NextResponse.json(
    results.map((r) => ({
      tripId: r.tripId,
      traveler: {
        id: r.trip.traveler.id,
        firstName: r.trip.traveler.firstName,
        avatarUrl: r.trip.traveler.avatarUrl,
        ratingAverage: r.trip.traveler.ratingAverage,
        ratingCount: r.trip.traveler.ratingCount,
        identityVerified: Boolean(r.trip.traveler.identityVerifiedAt),
      },
      mode: r.trip.mode,
      departureAt: r.trip.departureAt,
      arrivalAt: r.trip.arrivalAt,
      contributionAmount: r.trip.contributionAmount,
      totalAmount: displayPrice(r.trip.contributionAmount),
      remainingParcels: r.trip.remainingParcels,
      distanceOriginKm: Math.round(r.distanceOriginKm),
      distanceDestinationKm: Math.round(r.distanceDestinationKm),
      originLabel: r.trip.originLabel,
      originLat: r.trip.originLat,
      originLng: r.trip.originLng,
      destinationLabel: r.trip.destinationLabel,
      destinationLat: r.trip.destinationLat,
      destinationLng: r.trip.destinationLng,
    }))
  );
}

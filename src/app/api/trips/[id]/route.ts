import { NextResponse } from "next/server";
import { displayPrice } from "@/server/pricing";
import { bandForParcel, loadPricingConfig } from "@/server/pricing-config";
import { clampToMinimum } from "@/server/pricing-grid";
import { prisma } from "@/lib/prisma";

// Public — consultable avant connexion, comme /recherche déjà accessible en
// mode "aperçu". Aucune donnée de contact n'est exposée (cf. messagerie/booking
// pour entrer en relation).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      traveler: {
        select: { id: true, firstName: true, avatarUrl: true, ratingAverage: true, ratingCount: true, identityVerifiedAt: true },
      },
    },
  });
  if (!trip) return NextResponse.json({ error: "Trajet introuvable" }, { status: 404 });

  // Prix pour un colis précis (?parcelId=…) ou un poids (?weightKg=…) : le tarif du trajet remonté au
  // minimum de la grille. Sans paramètre : le tarif du trajet seul.
  const config = await loadPricingConfig();
  const { searchParams } = new URL(req.url);
  const parcelId = searchParams.get("parcelId");
  const weightKg = Number(searchParams.get("weightKg"));
  let band = null;
  if (parcelId) {
    const parcel = await prisma.parcel.findUnique({ where: { id: parcelId }, select: { weightKg: true, originLabel: true, destinationLabel: true } });
    if (parcel) band = bandForParcel(config, parcel);
  } else if (Number.isFinite(weightKg) && weightKg > 0) {
    band = bandForParcel(config, { weightKg, originLabel: trip.originLabel, destinationLabel: trip.destinationLabel });
  }
  const tripTotal = displayPrice(trip.contributionAmount, config.feeRate);
  const price = band ? clampToMinimum(tripTotal, band) : { total: tripTotal, adjustedToMinimum: false };

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
    totalAmount: price.total,
    priceAdjustedToMinimum: price.adjustedToMinimum,
    minPrice: band?.minPrice ?? null,
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

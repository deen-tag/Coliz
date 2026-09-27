import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Recherche "libre" : pas encore de colis publié, on filtre juste par villes/date
// pour montrer qu'il y a du monde disponible (conversion vers l'inscription ensuite).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from")?.trim();
  const to = searchParams.get("to")?.trim();
  const date = searchParams.get("date");
  // Période flexible autour de la date (brief §5) — ± jours, 3 par défaut,
  // réglable depuis le sélecteur "Période flexible" de la homepage.
  const flexDays = Math.max(0, Math.min(30, Number(searchParams.get("flex") ?? 3) || 0));

  const where: any = { status: { in: ["PUBLISHED", "PARTIALLY_BOOKED"] } };
  if (from) where.originLabel = { contains: from, mode: "insensitive" };
  if (to) where.destinationLabel = { contains: to, mode: "insensitive" };
  if (date) {
    const d = new Date(date);
    const from_ = new Date(d); from_.setDate(from_.getDate() - flexDays);
    const to_ = new Date(d); to_.setDate(to_.getDate() + flexDays);
    where.departureAt = { gte: from_, lte: to_ };
  }

  const trips = await prisma.trip.findMany({
    where,
    orderBy: { departureAt: "asc" },
    take: 20,
    include: { traveler: { select: { firstName: true, ratingAverage: true, ratingCount: true, identityVerifiedAt: true } } },
  });

  return NextResponse.json(
    trips.map((t) => ({
      tripId: t.id,
      traveler: {
        firstName: t.traveler.firstName,
        ratingAverage: t.traveler.ratingAverage,
        ratingCount: t.traveler.ratingCount,
        identityVerified: Boolean(t.traveler.identityVerifiedAt),
      },
      originLabel: t.originLabel,
      originLat: t.originLat,
      originLng: t.originLng,
      destinationLabel: t.destinationLabel,
      destinationLat: t.destinationLat,
      destinationLng: t.destinationLng,
      mode: t.mode,
      departureAt: t.departureAt,
      arrivalAt: t.arrivalAt,
      contributionAmount: t.contributionAmount,
      remainingParcels: t.remainingParcels,
    }))
  );
}

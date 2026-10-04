import { NextResponse } from "next/server";
import { displayPrice } from "@/server/pricing";
import { prisma } from "@/lib/prisma";

// Rayon de recherche autour d'une ville choisie (à vol d'oiseau).
const RADIUS_KM = 40;

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
  // Pagination "Voir plus" : 15 trajets par paquet, offset = nombre déjà affichés.
  const limit = Math.max(1, Math.min(30, Number(searchParams.get("limit") ?? 15) || 15));
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);

  // Uniquement des trajets encore réservables : places libres, pas déjà partis.
  const where: any = {
    status: { in: ["PUBLISHED", "PARTIALLY_BOOKED"] },
    remainingParcels: { gt: 0 },
    departureAt: { gte: new Date() },
  };
  // Ville choisie dans la liste (coordonnées connues) : on cherche dans un rayon autour d'elle,
  // pour que « Paris » trouve aussi Orly, Roissy, Versailles… Sinon, saisie libre : on cherche sur le nom.
  const num = (k: string) => {
    const v = searchParams.get(k);
    return v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
  };
  const near = (lat: number, lng: number) => {
    const dLat = RADIUS_KM / 111;
    const dLng = RADIUS_KM / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
    return { lat: { gte: lat - dLat, lte: lat + dLat }, lng: { gte: lng - dLng, lte: lng + dLng } };
  };
  const fromLat = num("fromLat"), fromLng = num("fromLng");
  const toLat = num("toLat"), toLng = num("toLng");
  if (fromLat !== null && fromLng !== null) {
    const b = near(fromLat, fromLng);
    where.originLat = b.lat;
    where.originLng = b.lng;
  } else if (from) where.originLabel = { contains: from, mode: "insensitive" };
  if (toLat !== null && toLng !== null) {
    const b = near(toLat, toLng);
    where.destinationLat = b.lat;
    where.destinationLng = b.lng;
  } else if (to) where.destinationLabel = { contains: to, mode: "insensitive" };
  if (date) {
    const d = new Date(date);
    const from_ = new Date(d); from_.setDate(from_.getDate() - flexDays);
    const to_ = new Date(d); to_.setDate(to_.getDate() + flexDays);
    const now = new Date();
    where.departureAt = { gte: from_ > now ? from_ : now, lte: to_ };
  }

  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      // Du départ le plus proche au plus lointain (puis id pour un ordre stable entre deux pages).
      orderBy: [{ departureAt: "asc" }, { id: "asc" }],
      skip: offset,
      take: limit,
      include: { traveler: { select: { firstName: true, avatarUrl: true, ratingAverage: true, ratingCount: true, identityVerifiedAt: true } } },
    }),
    prisma.trip.count({ where }),
  ]);

  const items = trips.map((t) => ({
      tripId: t.id,
      traveler: {
        firstName: t.traveler.firstName,
        avatarUrl: t.traveler.avatarUrl,
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
      totalAmount: displayPrice(t.contributionAmount),
      remainingParcels: t.remainingParcels,
    }));

  return NextResponse.json({ trips: items, total, hasMore: offset + items.length < total });
}

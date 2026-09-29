import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerificationSummary } from "@/server/auth/verification";
import { displayPrice } from "@/server/pricing";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const reviews = await prisma.review.findMany({
    where: { targetId: user.id, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { author: { select: { firstName: true } } },
  });

  // Éléments de confiance calculés à partir de données existantes.
  const [completedTrips, upcomingTrips] = await Promise.all([
    prisma.booking.count({ where: { travelerId: user.id, status: "COMPLETED" } }),
    prisma.trip.findMany({
      where: {
        travelerId: user.id,
        status: { in: ["PUBLISHED", "PARTIALLY_BOOKED"] },
        remainingParcels: { gt: 0 },
        departureAt: { gte: new Date() },
      },
      orderBy: { departureAt: "asc" },
      take: 3,
    }),
  ]);

  return NextResponse.json({
    id: user.id,
    memberSince: user.createdAt,
    completedTrips,
    upcomingTrips: upcomingTrips.map((t) => ({
      id: t.id,
      originLabel: t.originLabel,
      destinationLabel: t.destinationLabel,
      departureAt: t.departureAt,
      mode: t.mode,
      totalAmount: displayPrice(t.contributionAmount),
    })),
    firstName: user.firstName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    ratingAverage: user.ratingAverage,
    ratingCount: user.ratingCount,
    verification: getVerificationSummary(user),
    reviews: reviews.map((r) => ({ rating: r.rating, comment: r.comment, author: r.author.firstName, createdAt: r.createdAt })),
  });
}

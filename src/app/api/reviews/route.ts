import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";

const reviewSchema = z.object({
  bookingId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.status !== "COMPLETED") {
    return NextResponse.json({ error: "L'avis n'est possible qu'après livraison confirmée" }, { status: 422 });
  }
  if (booking.senderId !== user.id && booking.travelerId !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const targetId = booking.senderId === user.id ? booking.travelerId : booking.senderId;

  const existing = await prisma.review.findFirst({ where: { bookingId: booking.id, authorId: user.id } });
  if (existing) return NextResponse.json({ error: "Avis déjà déposé pour cette réservation" }, { status: 409 });

  const review = await prisma.review.create({
    data: { bookingId: booking.id, authorId: user.id, targetId, rating: parsed.data.rating, comment: parsed.data.comment },
  });

  // Recalcul de la moyenne — simple, correct pour un volume modéré ; à optimiser
  // (agrégat matérialisé) si le nombre d'avis par utilisateur devient important.
  const agg = await prisma.review.aggregate({
    where: { targetId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.user.update({
    where: { id: targetId },
    data: { ratingAverage: agg._avg.rating ?? 0, ratingCount: agg._count },
  });

  return NextResponse.json(review, { status: 201 });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerificationSummary } from "@/server/auth/verification";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const reviews = await prisma.review.findMany({
    where: { targetId: user.id, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { author: { select: { firstName: true } } },
  });

  return NextResponse.json({
    id: user.id,
    firstName: user.firstName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    ratingAverage: user.ratingAverage,
    ratingCount: user.ratingCount,
    verification: getVerificationSummary(user),
    reviews: reviews.map((r) => ({ rating: r.rating, comment: r.comment, author: r.author.firstName, createdAt: r.createdAt })),
  });
}

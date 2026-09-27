import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      parcel: true,
      trip: true,
      traveler: { select: { id: true, firstName: true, avatarUrl: true, ratingAverage: true, identityVerifiedAt: true } },
      sender: { select: { id: true, firstName: true, avatarUrl: true, identityVerifiedAt: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.senderId !== user.id && booking.travelerId !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  return NextResponse.json(booking);
}

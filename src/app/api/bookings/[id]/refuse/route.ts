import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { notifyUser } from "@/server/notifications/service";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.travelerId !== user.id) {
    return NextResponse.json({ error: "Seul le voyageur peut refuser cette demande" }, { status: 403 });
  }
  if (booking.status !== "REQUESTED") {
    return NextResponse.json(
      { error: `Impossible de refuser depuis l'état ${booking.status}` },
      { status: 422 }
    );
  }

  await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
  await notifyUser(booking.senderId, "booking_refused", "Votre demande de réservation a été refusée par le voyageur.");

  return NextResponse.json({ ok: true, status: "CANCELLED" });
}

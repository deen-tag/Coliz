import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { notifyUser } from "@/server/notifications/service";

// L'accord explicite du voyageur avant paiement — jusqu'ici le paiement
// pouvait démarrer directement depuis REQUESTED, sans que le voyageur ait
// donné son accord. Cette route ne remplace rien : elle ajoute l'étape
// manquante avant /pay.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.travelerId !== user.id) {
    return NextResponse.json({ error: "Seul le voyageur peut accepter cette demande" }, { status: 403 });
  }
  if (booking.status !== "REQUESTED") {
    return NextResponse.json(
      { error: `Impossible d'accepter depuis l'état ${booking.status}` },
      { status: 422 }
    );
  }

  await prisma.booking.update({ where: { id: booking.id }, data: { status: "ACCEPTED" } });
  await notifyUser(booking.senderId, "booking_accepted", "Votre demande de réservation a été acceptée. Vous pouvez procéder au paiement.");

  return NextResponse.json({ ok: true, status: "ACCEPTED" });
}

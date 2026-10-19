import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { notifyUser } from "@/server/notifications/service";
import { assertPriceGate } from "@/server/negotiation-service";

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

  // Pas d'accord sur la demande tant qu'une offre de prix est en attente, ou si le prix est sous le
  // minimum de la grille : le voyageur s'engage sur un prix précis.
  const gate = await assertPriceGate(booking.id);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error, code: gate.code, minPrice: gate.minPrice }, { status: gate.status });
  }

  await prisma.booking.update({ where: { id: booking.id }, data: { status: "ACCEPTED" } });
  await notifyUser(booking.senderId, "booking_accepted", "Votre demande de réservation a été acceptée. Vous pouvez procéder au paiement.", { bookingId: booking.id });

  return NextResponse.json({ ok: true, status: "ACCEPTED" });
}

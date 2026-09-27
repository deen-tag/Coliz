import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { notifyUser } from "@/server/notifications/service";
import { verifyTransferCode } from "@/server/security/transfer-codes";
import { transferToTraveler } from "@/server/stripe/transfer";

const bodySchema = z.object({ code: z.string().min(4).max(12) });

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Aucun code de réception actif pour cette réservation.",
  EXPIRED: "Ce code de réception a expiré. Demandez à l'expéditeur de le régénérer.",
  LOCKED: "Trop de tentatives incorrectes. Demandez à l'expéditeur de régénérer le code.",
  INVALID_CODE: "Code incorrect.",
};

// Seule route qui peut faire passer un booking à DELIVERED / COMPLETED.
// Le voyageur ne connaît ce code que parce que le réceptionniste, désigné
// et briefé par l'expéditeur, le lui communique en personne à l'arrivée.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.travelerId !== user.id) {
    return NextResponse.json({ error: "Seul le voyageur peut saisir ce code" }, { status: 403 });
  }
  if (booking.status !== "PICKED_UP") {
    return NextResponse.json(
      { error: `Impossible de confirmer la livraison depuis l'état ${booking.status}` },
      { status: 422 }
    );
  }

  const result = await verifyTransferCode(booking.id, "DELIVERY", parsed.data.code, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: ERROR_MESSAGES[result.reason] }, { status: 422 });
  }

  await prisma.$transaction([
    prisma.booking.update({ where: { id: booking.id }, data: { status: "DELIVERED" } }),
    prisma.parcel.update({ where: { id: booking.parcelId }, data: { status: "DELIVERED" } }),
  ]);

  // Règle métier Coliz inchangée : le transfert vers le voyageur est
  // déclenché à la livraison confirmée — mais désormais celle-ci est
  // prouvée par un code, plus par une simple déclaration du voyageur.
  await transferToTraveler(booking.id);
  await prisma.booking.update({ where: { id: booking.id }, data: { status: "COMPLETED" } });

  await notifyUser(booking.senderId, "delivery_confirmed", "Votre colis a été livré.");

  return NextResponse.json({ ok: true, status: "COMPLETED" });
}

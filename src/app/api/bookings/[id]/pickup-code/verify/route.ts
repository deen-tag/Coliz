import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { notifyUser } from "@/server/notifications/service";
import { verifyTransferCode } from "@/server/security/transfer-codes";

const bodySchema = z.object({ code: z.string().min(4).max(12) });

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Aucun code de remise actif pour cette réservation.",
  EXPIRED: "Ce code de remise a expiré. Demandez à l'expéditeur de le régénérer.",
  LOCKED: "Trop de tentatives incorrectes. Demandez à l'expéditeur de régénérer le code.",
  INVALID_CODE: "Code incorrect.",
};

// Seule route qui peut faire passer un booking à PICKED_UP — plus aucune
// route ne permet de fixer ce statut "à la main" (cf. suppression de
// l'ancienne route PATCH /status).
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
  if (booking.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: `Impossible de confirmer la prise en charge depuis l'état ${booking.status}` },
      { status: 422 }
    );
  }

  const result = await verifyTransferCode(booking.id, "PICKUP", parsed.data.code, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: ERROR_MESSAGES[result.reason] }, { status: 422 });
  }

  await prisma.$transaction([
    prisma.booking.update({ where: { id: booking.id }, data: { status: "PICKED_UP" } }),
    prisma.parcel.update({ where: { id: booking.parcelId }, data: { status: "IN_TRANSIT" } }),
  ]);

  await notifyUser(booking.senderId, "parcel_picked_up", "Votre colis a été pris en charge par le voyageur.");

  return NextResponse.json({ ok: true, status: "PICKED_UP" });
}

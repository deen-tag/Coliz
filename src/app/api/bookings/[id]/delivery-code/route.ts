import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { getPlaintextCode, regenerateTransferCode } from "@/server/security/transfer-codes";

// Réservé à l'expéditeur : le code de réception lui appartient dès la
// confirmation du paiement, comme le code de remise. C'est lui — et lui
// seul — qui décide à qui et quand le transmettre pour la réception à
// l'arrivée. Coliz n'a aucune visibilité sur ce second échange.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.senderId !== user.id) {
    return NextResponse.json({ error: "Seul l'expéditeur peut consulter ce code" }, { status: 403 });
  }

  const result = await getPlaintextCode(booking.id, "DELIVERY");
  if (!result) {
    return NextResponse.json({ code: null, reason: "expired_or_used" });
  }
  return NextResponse.json({ code: result.code, expiresAt: result.expiresAt });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.senderId !== user.id) {
    return NextResponse.json({ error: "Seul l'expéditeur peut régénérer ce code" }, { status: 403 });
  }

  try {
    await regenerateTransferCode(booking.id, "DELIVERY");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
  const result = await getPlaintextCode(booking.id, "DELIVERY");
  return NextResponse.json({ code: result?.code, expiresAt: result?.expiresAt });
}

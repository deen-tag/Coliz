import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { getPlaintextCode, regenerateTransferCode } from "@/server/security/transfer-codes";

// Réservé à l'expéditeur : c'est lui qui détient le code de remise et le
// transmet en personne au voyageur au départ. Le voyageur n'a jamais accès
// à cette route (cf. src/app/api/bookings/[id]/pickup-code/verify/route.ts
// pour la saisie côté voyageur).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.senderId !== user.id) {
    return NextResponse.json({ error: "Seul l'expéditeur peut consulter ce code" }, { status: 403 });
  }

  const result = await getPlaintextCode(booking.id, "PICKUP");
  if (!result) {
    return NextResponse.json({ code: null, reason: "expired_or_used" });
  }
  return NextResponse.json({ code: result.code, expiresAt: result.expiresAt });
}

// Régénération — uniquement si le code actuel est expiré ou verrouillé
// (trop de tentatives échouées côté voyageur).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.senderId !== user.id) {
    return NextResponse.json({ error: "Seul l'expéditeur peut régénérer ce code" }, { status: 403 });
  }

  try {
    await regenerateTransferCode(booking.id, "PICKUP");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
  const result = await getPlaintextCode(booking.id, "PICKUP");
  return NextResponse.json({ code: result?.code, expiresAt: result?.expiresAt });
}

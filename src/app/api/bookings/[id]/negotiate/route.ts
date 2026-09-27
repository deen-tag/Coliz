import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeBookingAmounts } from "@/server/stripe/client";
import { requireUser } from "@/server/auth/session";
import { notifyUser } from "@/server/notifications/service";

const bodySchema = z.object({ amount: z.number().positive().max(10000) });

// Négociation volontairement simple (pas de fil d'offres/contre-offres) :
// l'une des deux parties propose un montant, il s'applique immédiatement au
// prix de la réservation — l'échange sur le montant se fait dans la
// messagerie, cette route ne fait qu'enregistrer le résultat convenu.
// Seulement possible avant paiement, pour ne jamais toucher un montant déjà
// facturé/transféré.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.senderId !== user.id && booking.travelerId !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  if (!["REQUESTED", "ACCEPTED"].includes(booking.status)) {
    return NextResponse.json(
      { error: "Le prix ne peut plus être modifié une fois le paiement engagé" },
      { status: 422 }
    );
  }

  const { contributionAmount, platformFeeAmount, totalAmount } = computeBookingAmounts(parsed.data.amount);

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { negotiatedAmount: parsed.data.amount, contributionAmount, platformFeeAmount, totalAmount },
  });

  const recipientId = booking.senderId === user.id ? booking.travelerId : booking.senderId;
  await notifyUser(recipientId, "price_proposed", `Un nouveau prix a été proposé : ${parsed.data.amount.toFixed(2)} €.`);

  return NextResponse.json(updated);
}

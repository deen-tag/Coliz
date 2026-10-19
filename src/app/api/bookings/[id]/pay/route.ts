import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, toStripeAmount } from "@/server/stripe/client";
import { requireUser } from "@/server/auth/session";
import { assertPriceGate } from "@/server/negotiation-service";

/**
 * Stratégie de paiement retenue : "separate charges & transfers".
 * On encaisse le montant total sur le compte plateforme (PaymentIntent classique,
 * PAS de destination charge), puis on déclenche un Transfer vers le compte Connect
 * du voyageur uniquement au moment défini par les règles métier Coliz
 * (ex : confirmation de prise en charge ou de livraison — cf. /api/bookings/[id]/transfer).
 * Ce choix donne le contrôle total sur le moment du transfert, ce qui correspond
 * à la logique de statuts du cahier des charges (Payé → Pris en charge → ... → Livré).
 * Il ne s'agit pas d'un séquestre juridique : les fonds transitent par le compte
 * plateforme Stripe puis sont transférés selon les règles ci-dessus.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();

  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.senderId !== user.id) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  // Le paiement suppose désormais l'accord explicite du voyageur
  // (POST /api/bookings/[id]/accept) avant de pouvoir être déclenché.
  if (booking.status !== "ACCEPTED" && booking.status !== "PAYMENT_PENDING") {
    return NextResponse.json({ error: "Cette réservation n'est pas payable dans son état actuel" }, { status: 422 });
  }

  // Le prix à payer doit être définitif : aucune offre en attente, et jamais sous le minimum.
  const gate = await assertPriceGate(booking.id);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error, code: gate.code, minPrice: gate.minPrice }, { status: gate.status });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: toStripeAmount(Number(booking.totalAmount)),
    currency: "eur",
    metadata: {
      bookingId: booking.id,
      contributionAmount: String(booking.contributionAmount),
      platformFeeAmount: String(booking.platformFeeAmount),
    },
    automatic_payment_methods: { enabled: true },
  });

  // Si le prix a été modifié (offre acceptée) pendant la création du paiement, on annule ce paiement
  // plutôt que d'encaisser un montant qui n'est plus le prix convenu.
  const locked = await prisma.booking.updateMany({
    where: { id: booking.id, status: { in: ["ACCEPTED", "PAYMENT_PENDING"] }, totalAmount: booking.totalAmount },
    data: { status: "PAYMENT_PENDING" },
  });
  if (locked.count === 0) {
    await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
    return NextResponse.json({ error: "Le prix vient d'être modifié : rechargez la réservation avant de payer." }, { status: 409 });
  }

  await prisma.transaction.create({
    data: {
      bookingId: booking.id,
      type: "PAYMENT_INTENT",
      status: "PENDING",
      amount: booking.totalAmount,
      stripeObjectId: paymentIntent.id,
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}

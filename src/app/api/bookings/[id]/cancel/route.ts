import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, toStripeAmount } from "@/server/stripe/client";
import { computeRefundRate } from "@/server/stripe/refund-policy";
import { requireUser } from "@/server/auth/session";
import { cancelBooking } from "@/server/bookings/capacity";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { trip: true },
  });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.senderId !== user.id && booking.travelerId !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Une fois le colis pris en charge, on ne peut plus annuler : il faut
  // passer par un signalement (incident).
  if (!["REQUESTED", "ACCEPTED", "PAYMENT_PENDING", "CONFIRMED"].includes(booking.status)) {
    return NextResponse.json(
      { error: "Cette réservation ne peut plus être annulée. Signalez un problème depuis le suivi." },
      { status: 422 }
    );
  }

  const paymentTx = await prisma.transaction.findFirst({
    where: { bookingId: booking.id, type: "PAYMENT_INTENT", status: "SUCCEEDED" },
  });

  if (!paymentTx) {
    // Pas encore payé : simple annulation, rien à rembourser.
    await cancelBooking(booking.id);
    return NextResponse.json({ refundRate: null });
  }

  const hoursBeforeDeparture = (booking.trip.departureAt.getTime() - Date.now()) / (1000 * 60 * 60);
  const refundRate = computeRefundRate(hoursBeforeDeparture);
  const refundAmount = Math.round(Number(booking.totalAmount) * refundRate * 100) / 100;

  if (refundAmount > 0) {
    await stripe.refunds.create({
      payment_intent: paymentTx.stripeObjectId!,
      amount: toStripeAmount(refundAmount),
    });
    // Le statut de la réservation et l'écriture REFUND sont finalisés par le
    // webhook `charge.refunded` — source de vérité unique sur l'état Stripe.
  } else {
    await cancelBooking(booking.id);
  }

  return NextResponse.json({ refundRate, refundAmount });
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/server/stripe/client";
import { notifyUser } from "@/server/notifications/service";
import { issueTransferCodes } from "@/server/security/transfer-codes";
import { cancelBookingTx } from "@/server/bookings/capacity";
import type Stripe from "stripe";

export const runtime = "nodejs"; // nécessaire : l'edge runtime ne peut pas lire le raw body

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = headers().get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case "payment_intent.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case "charge.refunded":
      await handleRefund(event.data.object as Stripe.Charge);
      break;
    case "account.updated":
      await handleAccountUpdated(event.data.object as Stripe.Account);
      break;
    case "identity.verification_session.verified":
      await handleIdentityVerified(event.data.object as Stripe.Identity.VerificationSession);
      break;
    case "identity.verification_session.requires_input":
      await handleIdentityFailed(event.data.object as Stripe.Identity.VerificationSession);
      break;
    default:
      // Événements non gérés — on les ignore volontairement.
      break;
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
  const bookingId = pi.metadata.bookingId;
  if (!bookingId) return;

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED" },
  });

  await prisma.transaction.updateMany({
    where: { bookingId, stripeObjectId: pi.id },
    data: { status: "SUCCEEDED", stripeEventId: pi.id },
  });

  await prisma.parcel.update({ where: { id: booking.parcelId }, data: { status: "PAID" } });

  // Les 2 codes (remise + réception) sont générés une seule fois ici, à la
  // confirmation du paiement — jamais à la demande d'un utilisateur, et
  // jamais modifiables par le voyageur (cf. src/server/security/transfer-codes.ts).
  await issueTransferCodes(booking.id);

  await notifyUser(
    booking.senderId,
    "payment_confirmed",
    "Votre paiement a bien été confirmé. Vos codes de remise et de réception sont disponibles dans le suivi du colis."
  );
  await notifyUser(booking.travelerId, "booking_accepted", "Le paiement de votre réservation a été confirmé.");
}

async function handlePaymentFailed(pi: Stripe.PaymentIntent) {
  const bookingId = pi.metadata.bookingId;
  if (!bookingId) return;

  await prisma.transaction.updateMany({
    where: { bookingId, stripeObjectId: pi.id },
    data: { status: "FAILED" },
  });
  // Retour à ACCEPTED : le voyageur a déjà donné son accord, l'expéditeur peut réessayer.
  await prisma.booking.update({ where: { id: bookingId }, data: { status: "ACCEPTED" } });
}

async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const transaction = await prisma.transaction.findFirst({ where: { stripeObjectId: paymentIntentId } });
  if (!transaction) return;

  await prisma.$transaction(async (tx) => {
    // Annule la réservation ET restitue ses places (une seule fois, même si
    // Stripe rejoue l'événement).
    await cancelBookingTx(tx, transaction.bookingId);
    await tx.transaction.create({
      data: {
        bookingId: transaction.bookingId,
        type: "REFUND",
        status: "SUCCEEDED",
        amount: charge.amount_refunded / 100,
        stripeObjectId: charge.id,
      },
    });
  });
}

async function handleAccountUpdated(account: Stripe.Account) {
  await prisma.stripeConnectedAccount.updateMany({
    where: { stripeAccountId: account.id },
    data: {
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      onboardingCompleted: Boolean(account.details_submitted && account.charges_enabled),
    },
  });
}

async function handleIdentityVerified(session: Stripe.Identity.VerificationSession) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { identityVerifiedAt: new Date() } }),
    prisma.verification.updateMany({
      where: { userId, type: "IDENTITY", status: "PENDING" },
      data: { status: "VERIFIED", verifiedAt: new Date() },
    }),
  ]);
}

async function handleIdentityFailed(session: Stripe.Identity.VerificationSession) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  await prisma.verification.updateMany({
    where: { userId, type: "IDENTITY", status: "PENDING" },
    data: { status: "FAILED" },
  });
}

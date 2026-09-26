import { prisma } from "@/lib/prisma";
import { stripe, toStripeAmount } from "./client";

/**
 * Transfère la part du voyageur (contributionAmount, hors commission) vers son
 * compte Stripe Connect. Appelée par le workflow de statut de réservation —
 * la règle métier Coliz pour le déclenchement (ex: à la livraison confirmée,
 * ou à la prise en charge) est décidée par le produit, pas par cette fonction.
 */
export async function transferToTraveler(bookingId: string) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { traveler: { include: { stripeConnectedAccount: true } } },
  });

  if (!booking.traveler.stripeConnectedAccount?.payoutsEnabled) {
    throw new Error("Le voyageur n'a pas terminé son onboarding Stripe (payouts non activés).");
  }

  const alreadyTransferred = await prisma.transaction.findFirst({
    where: { bookingId, type: "TRANSFER_TO_TRAVELER", status: "SUCCEEDED" },
  });
  if (alreadyTransferred) return alreadyTransferred;

  const transfer = await stripe.transfers.create({
    amount: toStripeAmount(Number(booking.contributionAmount)),
    currency: "eur",
    destination: booking.traveler.stripeConnectedAccount.stripeAccountId,
    metadata: { bookingId },
  });

  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        bookingId,
        type: "TRANSFER_TO_TRAVELER",
        status: "SUCCEEDED",
        amount: booking.contributionAmount,
        stripeObjectId: transfer.id,
      },
    }),
    prisma.wallet.update({
      where: { userId: booking.travelerId },
      data: { availableAmount: { increment: booking.contributionAmount } },
    }),
  ]);

  return transaction;
}

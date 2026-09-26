import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Taux de commission Coliz — à terme, lire depuis une config admin plutôt qu'en dur.
export const PLATFORM_FEE_RATE = 0.15; // 15%

/**
 * Calcule la répartition d'un paiement de réservation.
 * contributionAmount = ce que touche le voyageur (avant frais Stripe)
 * platformFeeAmount   = commission Coliz
 * totalAmount         = ce que paie l'expéditeur
 */
export function computeBookingAmounts(contributionAmount: number) {
  const platformFeeAmount = Math.round(contributionAmount * PLATFORM_FEE_RATE * 100) / 100;
  const totalAmount = Math.round((contributionAmount + platformFeeAmount) * 100) / 100;
  return { contributionAmount, platformFeeAmount, totalAmount };
}

export function toStripeAmount(amountEur: number) {
  return Math.round(amountEur * 100); // Stripe travaille en centimes
}

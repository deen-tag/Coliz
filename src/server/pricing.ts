// Calcul des montants d'une réservation — séparé du client Stripe pour pouvoir
// être utilisé partout (recherche publique comprise) sans instancier Stripe.

// Taux de commission Coliz — à terme, lire depuis une config admin plutôt qu'en dur.
export const PLATFORM_FEE_RATE = 0.15; // 15%

/**
 * contributionAmount = ce que touche le voyageur (avant frais Stripe)
 * platformFeeAmount   = commission Coliz
 * totalAmount         = ce que paie l'expéditeur
 */
export function computeBookingAmounts(contributionAmount: number) {
  const platformFeeAmount = Math.round(contributionAmount * PLATFORM_FEE_RATE * 100) / 100;
  const totalAmount = Math.round((contributionAmount + platformFeeAmount) * 100) / 100;
  return { contributionAmount, platformFeeAmount, totalAmount };
}

// Prix affiché à l'expéditeur : total tout compris.
export function displayPrice(contributionAmount: { toString(): string } | number | string) {
  return computeBookingAmounts(Number(contributionAmount.toString())).totalAmount;
}

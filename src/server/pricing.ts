// Calcul des montants d'une réservation — séparé du client Stripe pour pouvoir
// être utilisé partout (recherche publique comprise) sans instancier Stripe.
//
// Trois montants à ne jamais confondre :
//   totalAmount        = ce que paie l'expéditeur (le prix « tout compris » affiché et négocié)
//   contributionAmount = ce que touche le voyageur (avant frais Stripe)
//   platformFeeAmount  = frais de service Coliz
//   avec toujours  totalAmount = contributionAmount + platformFeeAmount

import { fromCents, toCents } from "./pricing-grid";

// Taux de commission par défaut. Le taux réellement appliqué est lu en base (PricingSettings,
// modifiable en admin) : cf. getFeeRate() dans pricing-config.ts. Cette valeur sert de repli.
export const PLATFORM_FEE_RATE = 0.15; // 15%

/** Taux valide (entre 0 et 50 %), sinon le taux par défaut. */
export function normalizeFeeRate(rate: unknown): number {
  const n = typeof rate === "number" ? rate : Number(rate);
  return Number.isFinite(n) && n >= 0 && n <= 0.5 ? n : PLATFORM_FEE_RATE;
}

/**
 * À partir de la part du voyageur : la commission s'ajoute par-dessus (ancien fonctionnement du
 * prix d'un trajet : le voyageur saisit ce qu'il veut recevoir).
 */
export function computeBookingAmounts(contributionAmount: number, feeRate: number = PLATFORM_FEE_RATE) {
  const platformFeeAmount = Math.round(contributionAmount * feeRate * 100) / 100;
  const totalAmount = Math.round((contributionAmount + platformFeeAmount) * 100) / 100;
  return { contributionAmount, platformFeeAmount, totalAmount };
}

/**
 * À partir du prix tout compris (celui de la grille et de la négociation) : la commission est
 * prélevée DANS ce prix. Le total reste exactement celui convenu, au centime ; c'est la même
 * répartition que computeBookingAmounts (total = part du voyageur × (1 + taux)), à l'arrondi près.
 */
export function splitTotal(totalAmount: number, feeRate: number = PLATFORM_FEE_RATE) {
  const rate = normalizeFeeRate(feeRate);
  const totalCents = toCents(totalAmount);
  const contributionCents = Math.round(totalCents / (1 + rate));
  return {
    contributionAmount: fromCents(contributionCents),
    platformFeeAmount: fromCents(totalCents - contributionCents),
    totalAmount: fromCents(totalCents),
  };
}

/**
 * Plus petite part du voyageur dont le total (commission ajoutée par-dessus) atteint `totalAmount`.
 * Sert à dire à un voyageur « saisissez au moins X € » quand son prix est sous le plancher.
 */
export function minContributionForTotal(totalAmount: number, feeRate: number = PLATFORM_FEE_RATE) {
  const rate = normalizeFeeRate(feeRate);
  let cents = Math.max(0, Math.floor((toCents(totalAmount) / (1 + rate)) - 2));
  while (toCents(computeBookingAmounts(fromCents(cents), rate).totalAmount) < toCents(totalAmount)) cents++;
  return fromCents(cents);
}

// Prix affiché à l'expéditeur : total tout compris.
export function displayPrice(contributionAmount: { toString(): string } | number | string, feeRate: number = PLATFORM_FEE_RATE) {
  return computeBookingAmounts(Number(contributionAmount.toString()), feeRate).totalAmount;
}

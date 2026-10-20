// Mise en conformité des anciens prix avec la grille — décisions PURES (aucun accès base).
// Appliquées par pricing-align.ts. On ne touche que ce qui n'engage pas encore d'argent.

import { clampToMinimum, toCents, type PriceBand } from "./pricing-grid";
import { computeBookingAmounts, minContributionForTotal, splitTotal } from "./pricing";

/** Trajet ouvert dont le prix tout compris est sous le plancher : nouvelle part du voyageur, sinon null. */
export function planTripFix(contribution: number, floor: number | null, feeRate: number): { newContribution: number; newTotal: number } | null {
  if (floor === null) return null;
  const total = computeBookingAmounts(contribution, feeRate).totalAmount;
  if (toCents(total) >= toCents(floor)) return null;
  const newContribution = minContributionForTotal(floor, feeRate);
  return { newContribution, newTotal: computeBookingAmounts(newContribution, feeRate).totalAmount };
}

/** Réservation non payée dont le prix est sous le minimum du colis : nouveaux montants, sinon null. */
export function planBookingFix(totalAmount: number, band: PriceBand, feeRate: number) {
  const { total, adjustedToMinimum } = clampToMinimum(totalAmount, band);
  return adjustedToMinimum ? splitTotal(total, feeRate) : null;
}

/** Prix proposé sur un colis devenu invalide (sous le minimum) : à effacer ? */
export function proposedAmountIsBelowMinimum(proposed: number, band: PriceBand) {
  return toCents(proposed) < toCents(band.minPrice);
}

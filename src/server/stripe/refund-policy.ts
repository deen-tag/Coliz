/**
 * Règles d'annulation retenues (à valider avec le produit avant mise en prod) :
 *  - > 48h avant le départ du trajet   → remboursement à 100%
 *  - entre 24h et 48h avant le départ  → remboursement à 50%
 *  - < 24h avant le départ             → pas de remboursement automatique
 */
export function computeRefundRate(hoursBeforeDeparture: number): number {
  if (hoursBeforeDeparture >= 48) return 1;
  if (hoursBeforeDeparture >= 24) return 0.5;
  return 0;
}

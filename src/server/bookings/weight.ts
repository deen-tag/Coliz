// Capacité d'un trajet en kilos. Fonctions pures (utilisables côté serveur et côté écran).
//
// Un trajet créé avec la capacité en kilos garde `remainingWeightKg` à jour : chaque réservation en
// retire le poids de son colis, chaque annulation le rend. Ces trajets n'ont pas de limite en nombre de
// colis : `remainingParcels` y vaut 1 tant qu'il reste de la place et 0 quand le trajet est complet, ce
// qui garde tous les filtres existants (« places > 0 ») valables sans les modifier.
// Un ancien trajet (remainingWeightKg vide) continue de fonctionner au nombre de colis.

/** Arrondi au gramme : évite les restes de calcul flottant (0,1 + 0,2). */
export const roundKg = (kg: number) => Math.round(kg * 1000) / 1000;

/** Moins d'un gramme restant : le trajet est complet. */
export const isWeightFull = (remainingKg: number) => roundKg(remainingKg) <= 0.001;

/** Le colis tient-il dans ce qu'il reste ? */
export const fitsRemainingWeight = (parcelKg: number, remainingKg: number) =>
  Number.isFinite(parcelKg) && parcelKg > 0 && roundKg(parcelKg) <= roundKg(remainingKg);

/** « 20 kg », « 1,5 kg », « 500 g ». */
export function formatKg(kg: number) {
  const r = roundKg(kg);
  if (r < 1) return `${Math.round(r * 1000)} g`;
  return `${String(r).replace(".", ",")} kg`;
}

type CapacityView = { remainingWeightKg?: number | null; remainingParcels: number };

/** Texte de capacité restante : kilos pour un trajet en kilos, places pour un ancien trajet. */
export function remainingCapacityLabel(trip: CapacityView) {
  if (trip.remainingWeightKg !== null && trip.remainingWeightKg !== undefined) {
    return `${formatKg(trip.remainingWeightKg)} disponible${trip.remainingWeightKg >= 2 ? "s" : ""}`;
  }
  const n = trip.remainingParcels;
  return `${n} place${n > 1 ? "s" : ""} restante${n > 1 ? "s" : ""}`;
}

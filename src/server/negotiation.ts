// Règles de la négociation de prix — logique PURE (aucun accès base), testable seule.
// Les routes et negotiation-service.ts ne font qu'appliquer ces décisions et les enregistrer.
//
// Principe : le prix est TOUT COMPRIS (payé par l'expéditeur). Chaque partie peut proposer un prix,
// l'autre l'accepte, le refuse ou fait une contre-proposition. Le prix de la réservation ne change
// qu'à l'acceptation. Aucune offre sous le minimum de la grille n'est jamais enregistrée ni acceptée.

import { checkAmount, clampToMinimum, formatEuro, toCents, type PriceBand } from "./pricing-grid";
import { computeBookingAmounts, splitTotal } from "./pricing";

export type Party = "SENDER" | "TRAVELER";
export type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED" | "WITHDRAWN";

export type OfferView = { id: string; authorRole: Party; amount: number; status: OfferStatus };

/** Un prix ne se discute qu'avant le paiement. */
export const NEGOTIABLE_STATUSES = ["REQUESTED", "ACCEPTED"] as const;
export const isNegotiable = (status: string) => (NEGOTIABLE_STATUSES as readonly string[]).includes(status);

export type Failure = {
  ok: false;
  httpStatus: 400 | 403 | 409 | 422;
  code: string;
  message: string;
  minPrice?: number;
};

const fail = (httpStatus: Failure["httpStatus"], code: string, message: string, minPrice?: number): Failure => ({
  ok: false,
  httpStatus,
  code,
  message,
  ...(minPrice !== undefined ? { minPrice } : {}),
});

export function partyOf(booking: { senderId: string; travelerId: string }, userId: string): Party | null {
  if (booking.senderId === userId) return "SENDER";
  if (booking.travelerId === userId) return "TRAVELER";
  return null;
}

// ───────── Nouvelle offre / contre-proposition ─────────

export type NewOfferDecision =
  | { ok: true; amount: number; supersede: { offerId: string; as: "COUNTERED" | "WITHDRAWN" } | null }
  | Failure;

export function evaluateNewOffer(input: {
  role: Party;
  bookingStatus: string;
  /** Prix actuel de la réservation (tout compris). */
  currentTotal: number;
  amount: unknown;
  band: PriceBand;
  pending: OfferView | null;
}): NewOfferDecision {
  const { role, bookingStatus, currentTotal, band, pending } = input;

  if (!isNegotiable(bookingStatus)) {
    return fail(422, "NOT_NEGOTIABLE", "Le prix ne peut plus être modifié une fois le paiement engagé.");
  }

  const check = checkAmount(input.amount, band);
  if (!check.ok) return fail(check.code === "INVALID" ? 400 : 422, check.code, check.message, band.minPrice);

  const pendingFromOther = pending && pending.authorRole !== role ? pending : null;
  if (pendingFromOther && toCents(pendingFromOther.amount) === check.cents) {
    return fail(422, "SAME_AS_PENDING", "C'est le prix que l'autre personne propose déjà : utilisez « Accepter ».");
  }
  if (!pendingFromOther && toCents(currentTotal) === check.cents) {
    return fail(422, "SAME_PRICE", "C'est déjà le prix actuel de la réservation.");
  }

  return {
    ok: true,
    amount: check.amount,
    supersede: pending ? { offerId: pending.id, as: pendingFromOther ? "COUNTERED" : "WITHDRAWN" } : null,
  };
}

// ───────── Réponse à une offre ─────────

export type OfferResponseDecision = { ok: true; nextStatus: "ACCEPTED" | "REJECTED" } | Failure;

export function evaluateOfferResponse(input: {
  role: Party;
  bookingStatus: string;
  offer: OfferView;
  action: "accept" | "reject";
  band: PriceBand;
}): OfferResponseDecision {
  const { role, bookingStatus, offer, action, band } = input;

  if (!isNegotiable(bookingStatus)) {
    return fail(422, "NOT_NEGOTIABLE", "Le prix ne peut plus être modifié une fois le paiement engagé.");
  }
  if (offer.status !== "PENDING") {
    return fail(409, "OFFER_NOT_PENDING", "Cette offre a déjà reçu une réponse ou a été remplacée.");
  }
  if (offer.authorRole === role) {
    return fail(403, "OWN_OFFER", "Vous ne pouvez pas répondre à votre propre offre.");
  }
  if (action === "accept" && toCents(offer.amount) < toCents(band.minPrice)) {
    // Garde-fou : le minimum a pu être relevé depuis l'offre.
    return fail(
      422,
      "TOO_LOW",
      `Cette offre (${formatEuro(offer.amount)}) est sous le minimum autorisé de ${formatEuro(band.minPrice)} : elle ne peut pas être acceptée.`,
      band.minPrice
    );
  }
  return { ok: true, nextStatus: action === "accept" ? "ACCEPTED" : "REJECTED" };
}

// ───────── Verrou avant « Accepter la demande » et « Payer » ─────────

/**
 * Le voyageur n'accepte pas la demande, et l'expéditeur ne paie pas, tant qu'une offre est en
 * attente ou que le prix est sous le minimum (ex. réservation créée avant la mise en place de la
 * grille, ou minimum relevé depuis).
 */
export function evaluatePriceGate(input: {
  totalAmount: number;
  band: PriceBand;
  pending: OfferView | null;
}): { ok: true } | Failure {
  if (input.pending) {
    return fail(409, "PENDING_OFFER", "Une offre de prix est en attente de réponse : répondez-y d'abord (accepter, refuser ou contre-proposer).");
  }
  if (toCents(input.totalAmount) < toCents(input.band.minPrice)) {
    return fail(
      422,
      "BELOW_MINIMUM",
      `Le prix de cette réservation (${formatEuro(input.totalAmount)}) est sous le minimum autorisé de ${formatEuro(input.band.minPrice)} pour ce colis. Proposez un prix d'au moins ${formatEuro(input.band.minPrice)}.`,
      input.band.minPrice
    );
  }
  return { ok: true };
}

// ───────── Prix initial d'une réservation ─────────

export type InitialPricing = {
  amounts: { contributionAmount: number; platformFeeAmount: number; totalAmount: number };
  /** Le tarif du trajet était sous le minimum du colis : il a été remonté au minimum. */
  adjustedToMinimum: boolean;
  /** Prix proposé par l'expéditeur à la publication du colis, s'il diffère du prix de départ. */
  initialOffer: number | null;
};

/**
 * Prix de départ d'une réservation = tarif du trajet (tout compris), remonté au minimum de la grille
 * pour le poids du colis. Si l'expéditeur avait proposé son propre prix (valide), il devient une
 * première offre en attente (le prix de la réservation ne change qu'à l'acceptation du voyageur).
 */
export function computeInitialPricing(input: {
  tripContribution: number;
  feeRate: number;
  band: PriceBand;
  proposedAmount?: number | null;
}): { ok: true } & InitialPricing {
  const tripTotal = computeBookingAmounts(input.tripContribution, input.feeRate).totalAmount;
  const { total: baseTotal, adjustedToMinimum } = clampToMinimum(tripTotal, input.band);

  // Un prix proposé devenu invalide depuis la publication du colis (minimum relevé entre-temps)
  // est simplement ignoré : la réservation démarre au prix de départ, déjà conforme au minimum.
  let initialOffer: number | null = null;
  if (input.proposedAmount !== undefined && input.proposedAmount !== null) {
    const check = checkAmount(input.proposedAmount, input.band);
    if (check.ok && check.cents !== toCents(baseTotal)) initialOffer = check.amount;
  }

  return { ok: true, amounts: splitTotal(baseTotal, input.feeRate), adjustedToMinimum, initialOffer };
}

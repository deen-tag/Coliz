import { describe, it, expect } from "vitest";
import { DEFAULT_PRICE_TIERS, resolvePriceBand } from "../pricing-grid";
import {
  computeInitialPricing,
  evaluateNewOffer,
  evaluateOfferResponse,
  evaluatePriceGate,
  partyOf,
  type OfferView,
} from "../negotiation";

const band3kg = resolvePriceBand(3, DEFAULT_PRICE_TIERS)!; // minimum 80 €, conseillé 80–120 €
const offer = (patch: Partial<OfferView> = {}): OfferView => ({ id: "o1", authorRole: "SENDER", amount: 90, status: "PENDING", ...patch });
const base = { role: "SENDER" as const, bookingStatus: "REQUESTED", currentTotal: 100, band: band3kg, pending: null };

describe("nouvelle offre", () => {
  it("refuse toute offre sous le minimum (3 kg → 80 €)", () => {
    for (const amount of [79.99, 60, 10]) {
      const r = evaluateNewOffer({ ...base, amount });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.code).toBe("TOO_LOW");
        expect(r.httpStatus).toBe(422);
        expect(r.minPrice).toBe(80);
      }
    }
  });
  it("accepte le minimum exact et la fourchette", () => {
    for (const amount of [80, 95, 120, 200]) expect(evaluateNewOffer({ ...base, amount }).ok).toBe(true);
  });
  it("refuse un montant illisible (400)", () => {
    const r = evaluateNewOffer({ ...base, amount: "abc" });
    expect(!r.ok && r.httpStatus).toBe(400);
  });
  it("n'autorise la négociation qu'avant le paiement", () => {
    for (const bookingStatus of ["PAYMENT_PENDING", "CONFIRMED", "PICKED_UP", "COMPLETED", "CANCELLED"]) {
      const r = evaluateNewOffer({ ...base, bookingStatus, amount: 90 });
      expect(!r.ok && r.code).toBe("NOT_NEGOTIABLE");
    }
    expect(evaluateNewOffer({ ...base, bookingStatus: "ACCEPTED", amount: 90 }).ok).toBe(true);
  });
  it("refuse de reproposer le prix actuel", () => {
    expect(evaluateNewOffer({ ...base, amount: 100 })).toMatchObject({ ok: false, code: "SAME_PRICE" });
  });
  it("contre-proposition : l'offre de l'autre devient COUNTERED", () => {
    const r = evaluateNewOffer({ ...base, role: "TRAVELER", amount: 110, pending: offer({ authorRole: "SENDER", amount: 90 }) });
    expect(r).toEqual({ ok: true, amount: 110, supersede: { offerId: "o1", as: "COUNTERED" } });
  });
  it("nouvelle offre de l'auteur : son offre précédente devient WITHDRAWN", () => {
    const r = evaluateNewOffer({ ...base, amount: 95, pending: offer({ authorRole: "SENDER", amount: 90 }) });
    expect(r).toEqual({ ok: true, amount: 95, supersede: { offerId: "o1", as: "WITHDRAWN" } });
  });
  it("refuse une contre-offre identique à l'offre reçue (il faut accepter)", () => {
    const r = evaluateNewOffer({ ...base, role: "TRAVELER", amount: 90, pending: offer({ amount: 90 }) });
    expect(r).toMatchObject({ ok: false, code: "SAME_AS_PENDING" });
  });
});

describe("réponse à une offre", () => {
  const respond = (patch: Record<string, unknown> = {}) =>
    evaluateOfferResponse({ role: "TRAVELER", bookingStatus: "REQUESTED", offer: offer(), action: "accept", band: band3kg, ...patch } as any);

  it("l'autre partie peut accepter ou refuser", () => {
    expect(respond()).toEqual({ ok: true, nextStatus: "ACCEPTED" });
    expect(respond({ action: "reject" })).toEqual({ ok: true, nextStatus: "REJECTED" });
  });
  it("on ne répond pas à sa propre offre", () => {
    expect(respond({ role: "SENDER" })).toMatchObject({ ok: false, code: "OWN_OFFER", httpStatus: 403 });
  });
  it("une offre déjà traitée ou remplacée ne peut plus être acceptée", () => {
    for (const status of ["ACCEPTED", "REJECTED", "COUNTERED", "WITHDRAWN"]) {
      expect(respond({ offer: offer({ status }) })).toMatchObject({ ok: false, code: "OFFER_NOT_PENDING", httpStatus: 409 });
    }
  });
  it("refuse d'accepter une offre devenue inférieure au minimum (grille relevée)", () => {
    const r = respond({ offer: offer({ amount: 70 }) });
    expect(r).toMatchObject({ ok: false, code: "TOO_LOW", minPrice: 80 });
    // …mais elle peut toujours être refusée
    expect(respond({ offer: offer({ amount: 70 }), action: "reject" }).ok).toBe(true);
  });
  it("aucune réponse après le paiement", () => {
    expect(respond({ bookingStatus: "CONFIRMED" })).toMatchObject({ ok: false, code: "NOT_NEGOTIABLE" });
  });
});

describe("verrou avant acceptation de la demande / paiement", () => {
  it("bloque tant qu'une offre est en attente", () => {
    expect(evaluatePriceGate({ totalAmount: 100, band: band3kg, pending: offer() })).toMatchObject({ ok: false, code: "PENDING_OFFER" });
  });
  it("bloque un prix sous le minimum (réservation ancienne ou grille relevée)", () => {
    expect(evaluatePriceGate({ totalAmount: 79.99, band: band3kg, pending: null })).toMatchObject({ ok: false, code: "BELOW_MINIMUM" });
  });
  it("laisse passer un prix conforme", () => {
    expect(evaluatePriceGate({ totalAmount: 80, band: band3kg, pending: null })).toEqual({ ok: true });
  });
});

describe("prix initial d'une réservation", () => {
  it("tarif du trajet au-dessus du minimum : inchangé (100 € reçus + 15 % = 115 €)", () => {
    const r = computeInitialPricing({ tripContribution: 100, feeRate: 0.15, band: band3kg });
    expect(r.amounts).toEqual({ contributionAmount: 100, platformFeeAmount: 15, totalAmount: 115 });
    expect(r.adjustedToMinimum).toBe(false);
    expect(r.initialOffer).toBeNull();
  });
  it("tarif du trajet sous le minimum : remonté à 80 € tout compris", () => {
    const r = computeInitialPricing({ tripContribution: 20, feeRate: 0.15, band: band3kg });
    expect(r.amounts.totalAmount).toBe(80);
    expect(r.amounts.contributionAmount + r.amounts.platformFeeAmount).toBeCloseTo(80, 2);
    expect(r.adjustedToMinimum).toBe(true);
  });
  it("prix proposé par l'expéditeur → première offre en attente (le prix ne change pas encore)", () => {
    const r = computeInitialPricing({ tripContribution: 100, feeRate: 0.15, band: band3kg, proposedAmount: 90 });
    expect(r.initialOffer).toBe(90);
    expect(r.amounts.totalAmount).toBe(115);
  });
  it("proposition identique au prix de départ ou devenue sous le minimum : ignorée", () => {
    expect(computeInitialPricing({ tripContribution: 100, feeRate: 0.15, band: band3kg, proposedAmount: 115 }).initialOffer).toBeNull();
    expect(computeInitialPricing({ tripContribution: 100, feeRate: 0.15, band: band3kg, proposedAmount: 70 }).initialOffer).toBeNull();
  });
});

describe("rôles", () => {
  it("identifie l'expéditeur, le voyageur et les tiers", () => {
    const booking = { senderId: "a", travelerId: "b" };
    expect(partyOf(booking, "a")).toBe("SENDER");
    expect(partyOf(booking, "b")).toBe("TRAVELER");
    expect(partyOf(booking, "c")).toBeNull();
  });
});

describe("négociation complète (scénario)", () => {
  it("offre 90 € → contre-offre 100 € → acceptation ; jamais sous 80 €", () => {
    // L'expéditeur propose 90 €
    const o1 = evaluateNewOffer({ ...base, amount: 90 });
    expect(o1.ok).toBe(true);
    // Le voyageur contre-propose 105 €
    const o2 = evaluateNewOffer({ ...base, role: "TRAVELER", amount: 105, pending: offer({ id: "o1", amount: 90 }) });
    expect(o2).toMatchObject({ ok: true, supersede: { as: "COUNTERED" } });
    // L'expéditeur tente 60 € : refusé
    const low = evaluateNewOffer({ ...base, amount: 60, pending: offer({ id: "o2", authorRole: "TRAVELER", amount: 105 }) });
    expect(low).toMatchObject({ ok: false, code: "TOO_LOW" });
    // L'expéditeur accepte les 105 €
    const accepted = evaluateOfferResponse({ role: "SENDER", bookingStatus: "REQUESTED", offer: offer({ id: "o2", authorRole: "TRAVELER", amount: 105 }), action: "accept", band: band3kg });
    expect(accepted).toEqual({ ok: true, nextStatus: "ACCEPTED" });
  });
});

import { describe, it, expect } from "vitest";
import { DEFAULT_PRICE_TIERS, resolvePriceBand } from "../pricing-grid";
import { planBookingFix, planTripFix, proposedAmountIsBelowMinimum } from "../pricing-align-plan";
import { computeBookingAmounts } from "../pricing";

describe("mise en conformité des anciens prix", () => {
  it("relève un trajet à 10 € de part voyageur au plancher de 25 € tout compris", () => {
    const fix = planTripFix(10, 25, 0.15)!;
    expect(fix.newTotal).toBeGreaterThanOrEqual(25);
    expect(computeBookingAmounts(fix.newContribution - 0.01, 0.15).totalAmount).toBeLessThan(25);
  });
  it("laisse un trajet déjà conforme (ou sans plancher) tel quel", () => {
    expect(planTripFix(100, 25, 0.15)).toBeNull();
    expect(planTripFix(10, null, 0.15)).toBeNull();
  });
  it("remonte une demande de 60 € à 80 € pour un colis de 3 kg, total exact", () => {
    const band = resolvePriceBand(3, DEFAULT_PRICE_TIERS)!;
    const fix = planBookingFix(60, band, 0.15)!;
    expect(fix.totalAmount).toBe(80);
    expect(Math.round((fix.contributionAmount + fix.platformFeeAmount) * 100)).toBe(8000);
  });
  it("ne touche pas une demande déjà au minimum ou au-dessus", () => {
    const band = resolvePriceBand(3, DEFAULT_PRICE_TIERS)!;
    expect(planBookingFix(80, band, 0.15)).toBeNull();
    expect(planBookingFix(115, band, 0.15)).toBeNull();
  });
  it("détecte un prix proposé sous le minimum", () => {
    const band = resolvePriceBand(3, DEFAULT_PRICE_TIERS)!;
    expect(proposedAmountIsBelowMinimum(79.99, band)).toBe(true);
    expect(proposedAmountIsBelowMinimum(80, band)).toBe(false);
  });
});

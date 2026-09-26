import { describe, it, expect } from "vitest";
import { computeBookingAmounts, PLATFORM_FEE_RATE } from "../client";

describe("computeBookingAmounts", () => {
  it("applique le taux de commission attendu", () => {
    const result = computeBookingAmounts(100);
    expect(result.contributionAmount).toBe(100);
    expect(result.platformFeeAmount).toBe(100 * PLATFORM_FEE_RATE);
    expect(result.totalAmount).toBe(100 + 100 * PLATFORM_FEE_RATE);
  });

  it("arrondit à 2 décimales sans erreur de flottant", () => {
    const result = computeBookingAmounts(19.99);
    expect(Number.isFinite(result.platformFeeAmount)).toBe(true);
    expect(result.platformFeeAmount.toString().split(".")[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });

  it("le total est toujours égal à contribution + commission", () => {
    for (const amount of [0, 5, 12.5, 250, 999.99]) {
      const r = computeBookingAmounts(amount);
      expect(r.totalAmount).toBeCloseTo(r.contributionAmount + r.platformFeeAmount, 2);
    }
  });
});

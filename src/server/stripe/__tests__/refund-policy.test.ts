import { describe, it, expect } from "vitest";
import { computeRefundRate } from "../refund-policy";

describe("computeRefundRate", () => {
  it("rembourse à 100% au-delà de 48h avant le départ", () => {
    expect(computeRefundRate(72)).toBe(1);
    expect(computeRefundRate(48)).toBe(1);
  });

  it("rembourse à 50% entre 24h et 48h avant le départ", () => {
    expect(computeRefundRate(47.9)).toBe(0.5);
    expect(computeRefundRate(24)).toBe(0.5);
  });

  it("ne rembourse pas en dessous de 24h avant le départ", () => {
    expect(computeRefundRate(23.9)).toBe(0);
    expect(computeRefundRate(0)).toBe(0);
    expect(computeRefundRate(-5)).toBe(0); // trajet déjà parti
  });
});

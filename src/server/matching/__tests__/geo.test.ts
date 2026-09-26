import { describe, it, expect } from "vitest";
import { haversineKm, fitsDimensions, computeMatchScore } from "../geo";

describe("haversineKm", () => {
  it("retourne 0 pour deux points identiques", () => {
    expect(haversineKm(48.8566, 2.3522, 48.8566, 2.3522)).toBeCloseTo(0, 5);
  });

  it("calcule une distance Paris → Lyon cohérente (~390 km à vol d'oiseau)", () => {
    const d = haversineKm(48.8566, 2.3522, 45.75, 4.85);
    expect(d).toBeGreaterThan(380);
    expect(d).toBeLessThan(400);
  });
});

describe("fitsDimensions", () => {
  const capacity = { capacityLengthCm: 60, capacityWidthCm: 40, capacityHeightCm: 40 };

  it("accepte un colis strictement plus petit que la capacité", () => {
    expect(fitsDimensions({ lengthCm: 50, widthCm: 30, heightCm: 30 }, capacity)).toBe(true);
  });

  it("accepte un colis exactement à la limite", () => {
    expect(fitsDimensions({ lengthCm: 60, widthCm: 40, heightCm: 40 }, capacity)).toBe(true);
  });

  it("refuse un colis qui dépasse sur une seule dimension", () => {
    expect(fitsDimensions({ lengthCm: 61, widthCm: 30, heightCm: 30 }, capacity)).toBe(false);
  });
});

describe("computeMatchScore", () => {
  it("un trajet plus proche et plus proche en date obtient un meilleur (plus bas) score", () => {
    const close = computeMatchScore(10, 10, 0);
    const far = computeMatchScore(100, 100, 3);
    expect(close).toBeLessThan(far);
  });

  it("un jour d'écart pèse 20 km dans le score", () => {
    expect(computeMatchScore(0, 0, 1)).toBe(20);
  });
});

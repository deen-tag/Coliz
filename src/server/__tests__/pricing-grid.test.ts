import { describe, it, expect } from "vitest";
import {
  DEFAULT_PRICE_TIERS,
  checkAmount,
  clampToMinimum,
  countryFromLabel,
  formatEuro,
  lowestMinimum,
  resolvePriceBand,
  validateGrid,
  type PriceTier,
} from "../pricing-grid";
import { computeBookingAmounts, minContributionForTotal, splitTotal } from "../pricing";

const band = (kg: number, tiers: PriceTier[] = DEFAULT_PRICE_TIERS, ctx = {}) => resolvePriceBand(kg, tiers, ctx)!;

describe("grille de départ : limites de poids", () => {
  // [poids, minimum, fourchette] — borne haute incluse dans la tranche
  const cases: [number, number, [number, number]][] = [
    [0.1, 25, [25, 40]],
    [0.5, 25, [25, 40]],
    [0.501, 35, [35, 55]],
    [1, 35, [35, 55]],
    [1.5, 50, [50, 75]],
    [2, 50, [50, 75]],
    [3, 90, [90, 140]], // exemple du cahier des charges
    [5, 90, [90, 140]],
    [5.01, 160, [160, 230]],
    [10, 160, [160, 230]],
    [12, 240, [240, 330]],
    [15, 240, [240, 330]],
    [17.5, 320, [320, 440]],
    [20, 320, [320, 440]],
  ];
  it.each(cases)("%s kg → minimum %s €, conseillé %j", (kg, min, [lo, hi]) => {
    const b = band(kg);
    expect(b.minPrice).toBe(min);
    expect([b.recommendedMin, b.recommendedMax]).toEqual([lo, hi]);
    expect(b.beyondGrid).toBe(false);
  });

  it("au-delà de 20 kg : minimum de la dernière tranche, sans fourchette", () => {
    const b = band(25);
    expect(b.minPrice).toBe(320);
    expect(b.recommendedMin).toBeNull();
    expect(b.beyondGrid).toBe(true);
  });

  it("un poids invalide n'a pas de tranche", () => {
    for (const kg of [0, -1, NaN, Infinity]) expect(resolvePriceBand(kg, DEFAULT_PRICE_TIERS)).toBeNull();
  });

  it("arrondit au gramme (2,0000001 reste dans « 1 à 2 kg »)", () => {
    expect(band(2.0000001).minPrice).toBe(50);
  });
});

describe("règles par couloir et suppléments", () => {
  const algeria: PriceTier = { label: "Algérie", destinationCountry: "Algérie", minWeightKg: 2, maxWeightKg: 5, minPrice: 60, recommendedMin: 60, recommendedMax: 90 };
  const tiers = [...DEFAULT_PRICE_TIERS, algeria];

  it("la règle du couloir l'emporte, sans tenir compte des accents ni de la casse", () => {
    expect(band(3, tiers, { destinationCountry: "ALGERIE" }).minPrice).toBe(60);
    expect(band(3, tiers, { destinationCountry: "Algérie" }).scope).toBe("route");
  });
  it("autre couloir ou pays inconnu : règle par défaut", () => {
    expect(band(3, tiers, { destinationCountry: "Maroc" }).minPrice).toBe(90);
    expect(band(3, tiers, {}).minPrice).toBe(90);
  });
  it("poids hors de la règle du couloir : retombe sur la règle par défaut", () => {
    expect(band(8, tiers, { destinationCountry: "Algérie" }).minPrice).toBe(160);
  });
  it("le supplément s'ajoute au minimum et à la fourchette", () => {
    const b = band(3, [{ ...DEFAULT_PRICE_TIERS[3], surcharge: 10 }]);
    expect([b.minPrice, b.recommendedMin, b.recommendedMax]).toEqual([100, 100, 150]);
  });
  it("ignore les tranches inactives", () => {
    const off = DEFAULT_PRICE_TIERS.map((t) => (t.maxWeightKg === 5 ? { ...t, active: false } : t));
    expect(band(3, off).minPrice).toBe(160); // trou : tranche supérieure (la plus protectrice)
  });
  it("lowestMinimum donne le plancher du couloir", () => {
    expect(lowestMinimum(DEFAULT_PRICE_TIERS)).toBe(25);
    expect(lowestMinimum([])).toBeNull();
  });
  it("déduit le pays de la fin du libellé", () => {
    expect(countryFromLabel("Alger, Alger, Algérie")).toBe("Algérie");
    expect(countryFromLabel("Paris")).toBeNull();
  });
});

describe("contrôle d'un prix proposé", () => {
  const b3 = band(3); // minimum 90 €
  it("refuse tout montant sous le minimum (3 kg → 90 €)", () => {
    for (const amount of [89.99, 50, 1, 0.01]) {
      const r = checkAmount(amount, b3);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("TOO_LOW");
    }
  });
  it("accepte le minimum exact et au-dessus", () => {
    for (const amount of [90, 90.01, 100, 140, 500]) expect(checkAmount(amount, b3).ok).toBe(true);
  });
  it("ne laisse pas un arrondi franchir le minimum (89,999)", () => {
    const r = checkAmount(89.999, b3);
    expect(r.ok).toBe(false);
  });
  it("refuse les valeurs invalides ou démesurées", () => {
    for (const v of [NaN, Infinity, -5, 0, "80", null, undefined]) {
      const r = checkAmount(v, b3);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("INVALID");
    }
    const r = checkAmount(10001, b3);
    expect(!r.ok && r.code).toBe("TOO_HIGH");
  });
  it("remonte un prix au minimum", () => {
    expect(clampToMinimum(60, b3)).toEqual({ total: 90, adjustedToMinimum: true });
    expect(clampToMinimum(95, b3)).toEqual({ total: 95, adjustedToMinimum: false });
  });
  it("formate les montants", () => {
    expect(formatEuro(80)).toBe("80 €");
    expect(formatEuro(80.5)).toBe("80,50 €");
  });
});

describe("validation de la grille (admin)", () => {
  it("la grille de départ est valide", () => expect(validateGrid(DEFAULT_PRICE_TIERS)).toEqual([]));
  const bad = (patch: Partial<PriceTier>, index = 0) => DEFAULT_PRICE_TIERS.map((t, i) => (i === index ? { ...t, ...patch } : t));
  it("refuse un minimum nul, une fourchette sous le minimum, un poids inversé", () => {
    expect(validateGrid(bad({ minPrice: 0 })).length).toBeGreaterThan(0);
    expect(validateGrid(bad({ recommendedMin: 10 })).length).toBeGreaterThan(0);
    expect(validateGrid(bad({ recommendedMax: 20 })).length).toBeGreaterThan(0);
    expect(validateGrid(bad({ maxWeightKg: 0 })).length).toBeGreaterThan(0);
  });
  it("refuse un chevauchement et un trou dans la règle par défaut", () => {
    expect(validateGrid(bad({ maxWeightKg: 0.7 })).some((i) => i.message.includes("chevauche"))).toBe(true);
    expect(validateGrid(bad({ minWeightKg: 1.2 }, 2)).some((i) => i.message.includes("Trou"))).toBe(true);
  });
  it("exige une règle par défaut active qui commence à 0 kg", () => {
    expect(validateGrid(DEFAULT_PRICE_TIERS.map((t) => ({ ...t, active: false }))).length).toBeGreaterThan(0);
    expect(validateGrid(DEFAULT_PRICE_TIERS.slice(1)).some((i) => i.message.includes("0 kg"))).toBe(true);
  });
  it("autorise une règle de couloir à côté de la règle par défaut", () => {
    const withRoute = [...DEFAULT_PRICE_TIERS, { minWeightKg: 2, maxWeightKg: 5, minPrice: 60, recommendedMin: 60, recommendedMax: 90, destinationCountry: "Algérie" }];
    expect(validateGrid(withRoute)).toEqual([]);
  });
});

describe("commission", () => {
  it("le total convenu reste exact, au centime, quel que soit le taux", () => {
    for (const rate of [0, 0.1, 0.15, 0.2, 0.333]) {
      for (const total of [25, 80, 80.01, 99.99, 123.45, 320]) {
        const r = splitTotal(total, rate);
        expect(r.totalAmount).toBe(total);
        expect(Math.round((r.contributionAmount + r.platformFeeAmount) * 100)).toBe(Math.round(total * 100));
      }
    }
  });
  it("distingue prix payé, part du voyageur et frais de service (15 % de 80 €)", () => {
    expect(splitTotal(115, 0.15)).toEqual({ contributionAmount: 100, platformFeeAmount: 15, totalAmount: 115 });
  });
  it("reste cohérent avec l'ancien calcul à partir de la part du voyageur", () => {
    const old = computeBookingAmounts(100, 0.15);
    expect(splitTotal(old.totalAmount, 0.15).contributionAmount).toBe(100);
  });
  it("un taux invalide retombe sur le taux par défaut", () => {
    expect(splitTotal(115, 5).platformFeeAmount).toBe(15);
  });
  it("minContributionForTotal atteint exactement le plancher", () => {
    for (const total of [25, 80, 130]) {
      const c = minContributionForTotal(total, 0.15);
      expect(computeBookingAmounts(c, 0.15).totalAmount).toBeGreaterThanOrEqual(total);
      expect(computeBookingAmounts(Math.round((c - 0.01) * 100) / 100, 0.15).totalAmount).toBeLessThan(total);
    }
  });
});

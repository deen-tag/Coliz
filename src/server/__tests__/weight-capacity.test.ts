import { describe, expect, it } from "vitest";
import { fitsRemainingWeight, formatKg, isWeightFull, remainingCapacityLabel, roundKg } from "../bookings/weight";

describe("capacité d'un trajet en kilos", () => {
  it("arrondit au gramme (pas de reste de calcul flottant)", () => {
    expect(roundKg(0.1 + 0.2)).toBe(0.3);
    expect(roundKg(20 - 4.9 - 5.1)).toBe(10);
  });

  it("un colis tient s'il pèse au plus ce qu'il reste", () => {
    expect(fitsRemainingWeight(5, 20)).toBe(true);
    expect(fitsRemainingWeight(20, 20)).toBe(true);
    expect(fitsRemainingWeight(20.001, 20)).toBe(false);
    expect(fitsRemainingWeight(3, 2.5)).toBe(false);
  });

  it("refuse un poids invalide", () => {
    for (const kg of [0, -1, NaN, Infinity]) expect(fitsRemainingWeight(kg, 20)).toBe(false);
  });

  it("plusieurs colis se partagent le poids total, jusqu'à complet", () => {
    let remaining = 20;
    for (const kg of [8, 7, 5]) {
      expect(fitsRemainingWeight(kg, remaining)).toBe(true);
      remaining = roundKg(remaining - kg);
    }
    expect(isWeightFull(remaining)).toBe(true);
    expect(fitsRemainingWeight(0.5, remaining)).toBe(false);
  });

  it("n'est pas complet tant qu'il reste de la place pour un petit colis", () => {
    expect(isWeightFull(0.3)).toBe(false);
    expect(isWeightFull(0)).toBe(true);
  });

  it("formate les poids", () => {
    expect(formatKg(20)).toBe("20 kg");
    expect(formatKg(1.5)).toBe("1,5 kg");
    expect(formatKg(0.5)).toBe("500 g");
  });

  it("affiche des kilos pour un trajet récent et des places pour un ancien", () => {
    expect(remainingCapacityLabel({ remainingWeightKg: 12, remainingParcels: 1 })).toBe("12 kg disponibles");
    expect(remainingCapacityLabel({ remainingWeightKg: 1, remainingParcels: 1 })).toBe("1 kg disponible");
    expect(remainingCapacityLabel({ remainingWeightKg: null, remainingParcels: 3 })).toBe("3 places restantes");
    expect(remainingCapacityLabel({ remainingParcels: 1 })).toBe("1 place restante");
  });
});

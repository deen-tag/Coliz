// Chargement de la configuration tarifaire depuis la base (grille + commission).
// Aucune mise en cache : deux petites requêtes, et une modification faite en admin s'applique
// immédiatement sur toutes les instances du serveur.

import { prisma } from "@/lib/prisma";
import { DEFAULT_PRICE_TIERS, countryFromLabel, lowestMinimum, resolvePriceBand, type PriceBand, type PriceTier, type RouteContext } from "./pricing-grid";
import { PLATFORM_FEE_RATE, normalizeFeeRate } from "./pricing";

export type PricingConfig = {
  feeRate: number;
  tiers: PriceTier[];
  /** Aucune grille enregistrée en base : la grille de départ du code est utilisée. */
  usingDefaultTiers: boolean;
};

export async function loadPricingConfig(): Promise<PricingConfig> {
  const [rows, settings] = await Promise.all([
    prisma.pricingTier.findMany({ orderBy: [{ minWeightKg: "asc" }, { createdAt: "asc" }] }),
    prisma.pricingSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const stored: PriceTier[] = rows.map((r) => ({
    id: r.id,
    label: r.label,
    originCountry: r.originCountry,
    destinationCountry: r.destinationCountry,
    minWeightKg: r.minWeightKg,
    maxWeightKg: r.maxWeightKg,
    minPrice: Number(r.minPrice.toString()),
    recommendedMin: Number(r.recommendedMin.toString()),
    recommendedMax: Number(r.recommendedMax.toString()),
    surcharge: Number(r.surcharge.toString()),
    active: r.active,
  }));

  return {
    feeRate: settings ? normalizeFeeRate(Number(settings.platformFeeRate.toString())) : PLATFORM_FEE_RATE,
    tiers: stored.length > 0 ? stored : DEFAULT_PRICE_TIERS,
    usingDefaultTiers: stored.length === 0,
  };
}

export async function getFeeRate(): Promise<number> {
  const settings = await prisma.pricingSettings.findUnique({ where: { id: "singleton" } });
  return settings ? normalizeFeeRate(Number(settings.platformFeeRate.toString())) : PLATFORM_FEE_RATE;
}

/**
 * Minimum et fourchette pour un poids et un couloir, avec la grille de la config.
 * Si la grille enregistrée ne couvre pas ce couloir (ex. uniquement des règles par pays), on se
 * replie sur la grille de départ : un colis n'est jamais sans minimum.
 */
export function bandFromConfig(config: PricingConfig, weightKg: number, ctx: RouteContext = {}): PriceBand | null {
  return resolvePriceBand(weightKg, config.tiers, ctx) ?? resolvePriceBand(weightKg, DEFAULT_PRICE_TIERS, ctx);
}

/** Couloir d'un colis, déduit des pays en fin de libellé des villes. */
export function routeContextOf(parcel: { originLabel: string; destinationLabel: string }): RouteContext {
  return { originCountry: countryFromLabel(parcel.originLabel), destinationCountry: countryFromLabel(parcel.destinationLabel) };
}

export function bandForParcel(config: PricingConfig, parcel: { weightKg: number; originLabel: string; destinationLabel: string }) {
  return bandFromConfig(config, parcel.weightKg, routeContextOf(parcel));
}

/** Plancher du prix (tout compris) d'un trajet sur ce couloir : le plus petit minimum de la grille. */
export function floorForRoute(config: PricingConfig, route: { originLabel: string; destinationLabel: string }) {
  const ctx = routeContextOf(route);
  return lowestMinimum(config.tiers, ctx) ?? lowestMinimum(DEFAULT_PRICE_TIERS, ctx);
}

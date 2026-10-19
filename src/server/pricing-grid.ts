// Grille tarifaire — logique PURE (aucun accès base de données ni Stripe) : testable seule et
// utilisable partout. Le chargement de la grille depuis la base est dans pricing-config.ts.
//
// Convention de montants : tous les prix de la grille sont TOUT COMPRIS, c'est-à-dire le prix que
// paie l'expéditeur. La commission Coliz est prélevée dedans (cf. splitTotal dans pricing.ts) : on
// n'ajoute jamais de commission par-dessus un prix affiché.

export const MAX_PRICE_EUR = 10000;

export type PriceTier = {
  id?: string;
  label?: string | null;
  /** Pays de départ (nom, ex. « Algérie »). Vide = valable pour tous les pays. */
  originCountry?: string | null;
  /** Pays d'arrivée. Vide = valable pour tous les pays. */
  destinationCountry?: string | null;
  /** Borne basse EXCLUE de la tranche, en kg. */
  minWeightKg: number;
  /** Borne haute INCLUSE de la tranche, en kg (un colis de 2 kg est dans « 1 à 2 kg »). */
  maxWeightKg: number;
  minPrice: number;
  recommendedMin: number;
  recommendedMax: number;
  /** Supplément ajouté au minimum et à la fourchette (ex. destination difficile). */
  surcharge?: number;
  active?: boolean;
};

// Grille de départ (hypothèses commerciales de lancement, PAS des tarifs de marché vérifiés).
// Sert de valeurs initiales (seed) et de repli tant qu'aucune grille n'est enregistrée en base.
export const DEFAULT_PRICE_TIERS: PriceTier[] = [
  { label: "Jusqu'à 500 g", minWeightKg: 0, maxWeightKg: 0.5, minPrice: 25, recommendedMin: 25, recommendedMax: 40 },
  { label: "500 g à 1 kg", minWeightKg: 0.5, maxWeightKg: 1, minPrice: 35, recommendedMin: 35, recommendedMax: 55 },
  { label: "1 à 2 kg", minWeightKg: 1, maxWeightKg: 2, minPrice: 50, recommendedMin: 50, recommendedMax: 75 },
  { label: "2 à 5 kg", minWeightKg: 2, maxWeightKg: 5, minPrice: 80, recommendedMin: 80, recommendedMax: 120 },
  { label: "5 à 10 kg", minWeightKg: 5, maxWeightKg: 10, minPrice: 130, recommendedMin: 130, recommendedMax: 180 },
  { label: "10 à 15 kg", minWeightKg: 10, maxWeightKg: 15, minPrice: 180, recommendedMin: 180, recommendedMax: 250 },
  { label: "15 à 20 kg", minWeightKg: 15, maxWeightKg: 20, minPrice: 230, recommendedMin: 230, recommendedMax: 320 },
];

// ───────── Montants ─────────
// On calcule toujours en centimes entiers pour éviter les erreurs de flottant (79.999 ≠ 80).

export const toCents = (euros: number) => Math.round(euros * 100);
export const fromCents = (cents: number) => cents / 100;

export function formatEuro(amount: number) {
  const cents = toCents(amount);
  const text = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ",");
  return `${text} €`;
}

/** Poids arrondi au gramme : évite qu'un 2,0000001 passe dans la tranche suivante. */
export const roundWeightKg = (kg: number) => Math.round(kg * 1000) / 1000;

// ───────── Pays ─────────

export function normalizeCountry(value?: string | null): string | null {
  if (!value) return null;
  const n = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return n === "" ? null : n;
}

/**
 * Pays déduit d'un libellé de lieu (« Alger, Alger, Algérie » → « Algérie »).
 * Les libellés de l'autocomplétion se terminent par le pays ; un libellé sans virgule
 * (« Paris ») ne permet pas de le connaître : on renvoie null (la règle par défaut s'applique).
 */
export function countryFromLabel(label?: string | null): string | null {
  if (!label) return null;
  const parts = label.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 1] : null;
}

// ───────── Résolution du minimum et de la fourchette ─────────

export type PriceBand = {
  weightKg: number;
  tierId: string | null;
  tierLabel: string | null;
  /** Minimum obligatoire, tout compris. */
  minPrice: number;
  /** Fourchette conseillée ; null au-delà de la grille (aucune fourchette définie). */
  recommendedMin: number | null;
  recommendedMax: number | null;
  /** Poids au-delà de la dernière tranche : on applique le minimum de la dernière tranche. */
  beyondGrid: boolean;
  /** « route » si une règle propre au couloir (pays) a été appliquée, sinon « default ». */
  scope: "default" | "route";
};

export type RouteContext = { originCountry?: string | null; destinationCountry?: string | null };

const specificity = (t: PriceTier) => (normalizeCountry(t.originCountry) ? 1 : 0) + (normalizeCountry(t.destinationCountry) ? 1 : 0);

function bandFromTier(tier: PriceTier, weightKg: number, beyondGrid: boolean): PriceBand {
  const surcharge = toCents(tier.surcharge ?? 0);
  return {
    weightKg,
    tierId: tier.id ?? null,
    tierLabel: tier.label ?? null,
    minPrice: fromCents(toCents(tier.minPrice) + surcharge),
    recommendedMin: beyondGrid ? null : fromCents(toCents(tier.recommendedMin) + surcharge),
    recommendedMax: beyondGrid ? null : fromCents(toCents(tier.recommendedMax) + surcharge),
    beyondGrid,
    scope: specificity(tier) > 0 ? "route" : "default",
  };
}

/**
 * Minimum et fourchette conseillée pour un colis.
 *
 * - tranche = ]minWeightKg ; maxWeightKg], borne haute incluse ;
 * - seules les tranches actives et applicables au couloir (pays de départ / d'arrivée) comptent ;
 *   la plus précise l'emporte (couloir exact > un seul pays > règle par défaut) ;
 * - poids dans un trou de la grille : tranche supérieure (le plus protecteur) ;
 * - poids au-delà de la dernière tranche : minimum de la dernière tranche, sans fourchette
 *   (on ne laisse jamais un colis lourd échapper au minimum).
 *
 * Retourne null si aucune tranche ne s'applique (grille vide) : l'appelant se replie alors sur
 * DEFAULT_PRICE_TIERS (cf. pricing-config.ts).
 */
export function resolvePriceBand(weightKgInput: number, tiers: PriceTier[], ctx: RouteContext = {}): PriceBand | null {
  if (!Number.isFinite(weightKgInput) || weightKgInput <= 0) return null;
  const weightKg = roundWeightKg(weightKgInput);
  const origin = normalizeCountry(ctx.originCountry);
  const destination = normalizeCountry(ctx.destinationCountry);

  const applicable = tiers.filter((t) => {
    if (t.active === false) return false;
    const to = normalizeCountry(t.originCountry);
    const td = normalizeCountry(t.destinationCountry);
    return (to === null || to === origin) && (td === null || td === destination);
  });
  if (applicable.length === 0) return null;

  // Départage déterministe : plus précis d'abord, puis minimum le plus élevé (le plus protecteur).
  const byPreference = (a: PriceTier, b: PriceTier) =>
    specificity(b) - specificity(a) || b.minPrice + (b.surcharge ?? 0) - (a.minPrice + (a.surcharge ?? 0));

  const covering = applicable.filter((t) => weightKg > t.minWeightKg && weightKg <= t.maxWeightKg).sort(byPreference);
  if (covering.length > 0) return bandFromTier(covering[0], weightKg, false);

  // Trou dans la grille : la plus petite tranche qui commence au-dessus du poids.
  const above = applicable
    .filter((t) => t.maxWeightKg >= weightKg)
    .sort((a, b) => a.maxWeightKg - b.maxWeightKg || byPreference(a, b));
  if (above.length > 0) return bandFromTier(above[0], weightKg, false);

  // Au-delà de la grille.
  const last = [...applicable].sort((a, b) => b.maxWeightKg - a.maxWeightKg || byPreference(a, b))[0];
  return bandFromTier(last, weightKg, true);
}

/**
 * Plus petit minimum de la grille pour un couloir (toutes tranches applicables confondues) :
 * c'est le plancher absolu d'un prix de trajet, avant même de connaître le poids du colis.
 */
export function lowestMinimum(tiers: PriceTier[], ctx: RouteContext = {}): number | null {
  const origin = normalizeCountry(ctx.originCountry);
  const destination = normalizeCountry(ctx.destinationCountry);
  const mins = tiers
    .filter((t) => {
      if (t.active === false) return false;
      const to = normalizeCountry(t.originCountry);
      const td = normalizeCountry(t.destinationCountry);
      return (to === null || to === origin) && (td === null || td === destination);
    })
    .map((t) => toCents(t.minPrice) + toCents(t.surcharge ?? 0));
  return mins.length === 0 ? null : fromCents(Math.min(...mins));
}

// ───────── Contrôle d'un montant ─────────

export type AmountCheck =
  | { ok: true; amount: number; cents: number }
  | { ok: false; code: "INVALID" | "TOO_LOW" | "TOO_HIGH"; message: string };

/** Valide un prix proposé : nombre, 2 décimales max, ≥ minimum de la tranche, ≤ plafond. */
export function checkAmount(amount: unknown, band: PriceBand): AmountCheck {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, code: "INVALID", message: "Saisissez un montant valide en euros." };
  }
  const cents = toCents(amount);
  // Plus de 2 décimales : on refuse plutôt que d'arrondir (79,999 ne doit pas devenir 80).
  if (Math.abs(amount * 100 - cents) > 1e-6) {
    return { ok: false, code: "INVALID", message: "Saisissez un montant avec deux décimales au maximum." };
  }
  if (cents < toCents(band.minPrice)) {
    return {
      ok: false,
      code: "TOO_LOW",
      message: `Le prix minimum autorisé pour ce colis est de ${formatEuro(band.minPrice)}. Proposez ${formatEuro(band.minPrice)} ou plus.`,
    };
  }
  if (cents > toCents(MAX_PRICE_EUR)) {
    return { ok: false, code: "TOO_HIGH", message: `Le montant ne peut pas dépasser ${formatEuro(MAX_PRICE_EUR)}.` };
  }
  return { ok: true, amount: fromCents(cents), cents };
}

/** Remonte un prix au minimum si besoin. */
export function clampToMinimum(totalEuros: number, band: PriceBand) {
  const adjusted = toCents(totalEuros) < toCents(band.minPrice);
  return { total: adjusted ? band.minPrice : fromCents(toCents(totalEuros)), adjustedToMinimum: adjusted };
}

// ───────── Validation d'une grille (admin) ─────────

export type GridIssue = { index: number | null; message: string };

const scopeKey = (t: PriceTier) => `${normalizeCountry(t.originCountry) ?? "*"}>${normalizeCountry(t.destinationCountry) ?? "*"}`;
const isPrice = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= MAX_PRICE_EUR;

/**
 * Contrôle une grille avant enregistrement : valeurs cohérentes, aucun chevauchement de poids
 * pour un même couloir, et couverture complète (sans trou, à partir de 0 kg) de la règle par défaut.
 */
export function validateGrid(tiers: PriceTier[]): GridIssue[] {
  const issues: GridIssue[] = [];
  const name = (i: number) => `Tranche ${i + 1}`;

  tiers.forEach((t, i) => {
    if (![t.minWeightKg, t.maxWeightKg].every((n) => typeof n === "number" && Number.isFinite(n))) {
      issues.push({ index: i, message: `${name(i)} : les poids doivent être des nombres.` });
      return;
    }
    if (t.minWeightKg < 0) issues.push({ index: i, message: `${name(i)} : le poids de départ ne peut pas être négatif.` });
    if (t.maxWeightKg <= t.minWeightKg) issues.push({ index: i, message: `${name(i)} : le poids maximum doit dépasser le poids de départ.` });
    if (!isPrice(t.minPrice) || t.minPrice <= 0) issues.push({ index: i, message: `${name(i)} : le prix minimum doit être un montant positif (≤ ${MAX_PRICE_EUR} €).` });
    if (!isPrice(t.recommendedMin) || !isPrice(t.recommendedMax)) {
      issues.push({ index: i, message: `${name(i)} : la fourchette conseillée doit être composée de montants valides.` });
    } else {
      if (t.recommendedMin < t.minPrice) issues.push({ index: i, message: `${name(i)} : la fourchette conseillée ne peut pas commencer sous le prix minimum.` });
      if (t.recommendedMax < t.recommendedMin) issues.push({ index: i, message: `${name(i)} : la fin de la fourchette doit être supérieure ou égale à son début.` });
    }
    if (t.surcharge !== undefined && !isPrice(t.surcharge)) issues.push({ index: i, message: `${name(i)} : le supplément doit être un montant positif ou nul.` });
  });
  if (issues.length > 0) return issues;

  const active = tiers.map((t, index) => ({ t, index })).filter(({ t }) => t.active !== false);

  // Chevauchements, couloir par couloir.
  const groups = new Map<string, { t: PriceTier; index: number }[]>();
  for (const item of active) {
    const key = scopeKey(item.t);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  groups.forEach((items) => {
    const sorted = [...items].sort((a, b) => a.t.minWeightKg - b.t.minWeightKg);
    for (let k = 1; k < sorted.length; k++) {
      if (sorted[k].t.minWeightKg < sorted[k - 1].t.maxWeightKg) {
        issues.push({
          index: sorted[k].index,
          message: `${name(sorted[k].index)} chevauche la tranche ${sorted[k - 1].index + 1} (même couloir).`,
        });
      }
    }
  });

  // La règle par défaut doit couvrir tous les poids sans trou.
  const defaults = (groups.get("*>*") ?? []).sort((a, b) => a.t.minWeightKg - b.t.minWeightKg);
  if (defaults.length === 0) {
    issues.push({ index: null, message: "Il faut au moins une tranche active sans pays (règle par défaut)." });
  } else {
    if (defaults[0].t.minWeightKg !== 0) {
      issues.push({ index: defaults[0].index, message: `${name(defaults[0].index)} : la règle par défaut doit commencer à 0 kg.` });
    }
    for (let k = 1; k < defaults.length; k++) {
      if (defaults[k].t.minWeightKg > defaults[k - 1].t.maxWeightKg) {
        issues.push({
          index: defaults[k].index,
          message: `Trou dans la grille par défaut entre ${defaults[k - 1].t.maxWeightKg} kg et ${defaults[k].t.minWeightKg} kg.`,
        });
      }
    }
  }
  return issues;
}

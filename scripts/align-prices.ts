// Exécuté au déploiement (après `prisma db push`), chaque opération UNE SEULE FOIS (suivie dans MaintenanceRun) :
//  1. grille : si la grille enregistrée en base est encore celle de lancement (jamais modifiée à la main),
//     les tranches à partir de 2 kg passent aux nouveaux tarifs. Une tranche modifiée en admin n'est jamais touchée ;
//  2. alignement : remet en conformité avec la grille les prix des trajets ouverts et des demandes non payées.
// Les réservations payées ne sont jamais touchées. Ne fait jamais échouer le build : en cas d'erreur, on
// journalise et on continue (nouvel essai au prochain déploiement, ou via Admin → Tarification).
import { prisma } from "../src/lib/prisma";
import { alignPrices } from "../src/server/pricing-align";
import { DEFAULT_PRICE_TIERS, LEGACY_PRICE_TIERS_V1 } from "../src/server/pricing-grid";

const TIERS_RUN_ID = "pricing-tiers-v2-2026-10";
const ALIGN_RUN_ID = "align-prices-2026-10b";

async function syncTiers() {
  if (await prisma.maintenanceRun.findUnique({ where: { id: TIERS_RUN_ID } })) return console.log("[pricing-tiers] déjà exécuté.");
  let changed = 0;
  for (const old of LEGACY_PRICE_TIERS_V1) {
    const next = DEFAULT_PRICE_TIERS.find((t) => t.minWeightKg === old.minWeightKg && t.maxWeightKg === old.maxWeightKg);
    if (!next) continue;
    const res = await prisma.pricingTier.updateMany({
      where: {
        originCountry: null,
        destinationCountry: null,
        minWeightKg: old.minWeightKg,
        maxWeightKg: old.maxWeightKg,
        minPrice: old.minPrice,
        recommendedMin: old.recommendedMin,
        recommendedMax: old.recommendedMax,
      },
      data: { minPrice: next.minPrice, recommendedMin: next.recommendedMin, recommendedMax: next.recommendedMax },
    });
    changed += res.count;
  }
  await prisma.maintenanceRun.create({ data: { id: TIERS_RUN_ID } });
  console.log(`[pricing-tiers] ${changed} tranche(s) de la grille enregistrée mise(s) à jour.`);
}

async function align() {
  if (await prisma.maintenanceRun.findUnique({ where: { id: ALIGN_RUN_ID } })) return console.log("[align-prices] déjà exécuté.");
  const result = await alignPrices({ apply: true });
  await prisma.maintenanceRun.create({ data: { id: ALIGN_RUN_ID } });
  console.log(`[align-prices] ${result.trips.count} trajet(s), ${result.bookings.count} demande(s), ${result.parcels.count} prix proposé(s) mis en conformité.`);
}

async function main() {
  if (!process.env.DATABASE_URL) return console.log("[align-prices] pas de base : ignoré.");
  await syncTiers();
  await align();
}

main()
  .catch((e) => console.error("[align-prices] échec (build non bloqué) :", e))
  .finally(() => prisma.$disconnect());

// Exécuté UNE SEULE FOIS au déploiement (après `prisma db push`) : remet en conformité avec la grille
// les anciens prix (trajets ouverts, demandes non payées). Les réservations payées ne sont jamais touchées.
// Ne fait jamais échouer le build : en cas d'erreur, on journalise et on continue (nouvel essai au
// prochain déploiement, ou via Admin → Tarification).
import { prisma } from "../src/lib/prisma";
import { alignPrices } from "../src/server/pricing-align";

const RUN_ID = "align-prices-2026-10";

async function main() {
  if (!process.env.DATABASE_URL) return console.log("[align-prices] pas de base : ignoré.");
  if (await prisma.maintenanceRun.findUnique({ where: { id: RUN_ID } })) return console.log("[align-prices] déjà exécuté.");

  const result = await alignPrices({ apply: true });
  await prisma.maintenanceRun.create({ data: { id: RUN_ID } });
  console.log(`[align-prices] ${result.trips.count} trajet(s), ${result.bookings.count} demande(s), ${result.parcels.count} prix proposé(s) mis en conformité.`);
}

main()
  .catch((e) => console.error("[align-prices] échec (build non bloqué) :", e))
  .finally(() => prisma.$disconnect());

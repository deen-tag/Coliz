import { PrismaClient } from "@prisma/client";
import { DEFAULT_PRICE_TIERS } from "../src/server/pricing-grid";
import { PLATFORM_FEE_RATE } from "../src/server/pricing";

const prisma = new PrismaClient();

async function main() {
  const modes = [
    { mode: "CAR" as const, legalRegime: "Cotransportage — le trajet doit préexister indépendamment du colis.", restrictionsText: "Confirmation obligatoire que le trajet est prévu pour un motif personnel." },
    { mode: "TRAIN" as const, legalRegime: "Transport de bagage accompagné par un voyageur.", restrictionsText: null },
    { mode: "PLANE" as const, legalRegime: "Soumis aux franchises bagage de la compagnie aérienne.", restrictionsText: "Objets interdits en soute/cabine à vérifier avec le transporteur aérien." },
    { mode: "BUS" as const, legalRegime: "Transport de bagage accompagné.", restrictionsText: null },
    { mode: "VAN" as const, legalRegime: "Cotransportage — mêmes règles que voiture.", restrictionsText: null },
    { mode: "MOTORCYCLE" as const, legalRegime: "Cotransportage, capacité réduite.", restrictionsText: null },
    { mode: "BICYCLE" as const, legalRegime: "Cotransportage, capacité très réduite.", restrictionsText: null },
    { mode: "FERRY" as const, legalRegime: "Transport de bagage accompagné.", restrictionsText: null },
    { mode: "OTHER" as const, legalRegime: "À qualifier au cas par cas.", restrictionsText: "Mode désactivé par défaut, à activer manuellement en admin." },
  ];

  for (const m of modes) {
    await prisma.transportModeRule.upsert({
      where: { mode: m.mode },
      update: {},
      create: { ...m, enabled: m.mode !== "OTHER" },
    });
  }

  await prisma.parcelRuleSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      maxWeightKg: 30,
      maxLengthCm: 100,
      maxWidthCm: 60,
      maxHeightCm: 60,
      maxDeclaredValue: 1000,
      prohibitedItemsText:
        "Espèces, bijoux de valeur, armes, produits illicites, denrées périssables, animaux vivants, produits dangereux/inflammables.",
    },
  });

  // Grille tarifaire de lancement (modifiable ensuite en admin). Créée seulement si aucune grille n'existe :
  // relancer le seed n'écrase jamais les tarifs modifiés. Sans seed, le code applique la même grille par défaut.
  if ((await prisma.pricingTier.count()) === 0) {
    await prisma.pricingTier.createMany({ data: DEFAULT_PRICE_TIERS.map((t) => ({ ...t, surcharge: 0, active: true })) });
  }
  await prisma.pricingSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", platformFeeRate: PLATFORM_FEE_RATE },
  });

  console.log("Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

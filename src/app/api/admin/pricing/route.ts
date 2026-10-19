import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/admin";
import { loadPricingConfig } from "@/server/pricing-config";
import { validateGrid, type PriceTier } from "@/server/pricing-grid";

export const dynamic = "force-dynamic";

// Paramétrage de la tarification (grille + commission), réservé aux administrateurs.
// Modifier ces valeurs ne demande aucun changement de code ni redéploiement.

export async function GET() {
  await requireAdmin();
  const config = await loadPricingConfig();
  return NextResponse.json({ feeRate: config.feeRate, tiers: config.tiers, usingDefaultTiers: config.usingDefaultTiers });
}

const country = z
  .string()
  .trim()
  .max(80)
  .nullish()
  .transform((v) => (v ? v : null));

const tierSchema = z.object({
  label: z.string().trim().max(60).nullish().transform((v) => (v ? v : null)),
  originCountry: country,
  destinationCountry: country,
  minWeightKg: z.number(),
  maxWeightKg: z.number(),
  minPrice: z.number(),
  recommendedMin: z.number(),
  recommendedMax: z.number(),
  surcharge: z.number().default(0),
  active: z.boolean().default(true),
});

const bodySchema = z.object({
  // Commission de la plateforme, en fraction (0.15 = 15 %), entre 0 et 50 %.
  feeRate: z.number().min(0).max(0.5),
  tiers: z.array(tierSchema).min(1).max(200),
});

// Remplace toute la grille et le taux en une seule transaction. Les réservations existantes gardent
// leur prix ; le nouveau minimum s'applique aux nouvelles offres, acceptations et paiements.
export async function PUT(req: Request) {
  const admin = await requireAdmin();
  // Le tarif engage la plateforme : réservé au rôle ADMIN (pas aux modérateurs).
  if (admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Seul un administrateur peut modifier les tarifs" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }
  const { feeRate, tiers } = parsed.data;

  const issues = validateGrid(tiers as PriceTier[]);
  if (issues.length > 0) {
    return NextResponse.json({ error: issues[0].message, issues }, { status: 422 });
  }

  await prisma.$transaction([
    prisma.pricingTier.deleteMany({}),
    prisma.pricingTier.createMany({ data: tiers }),
    prisma.pricingSettings.upsert({
      where: { id: "singleton" },
      update: { platformFeeRate: feeRate },
      create: { id: "singleton", platformFeeRate: feeRate },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATE_PRICING",
        targetType: "PricingGrid",
        targetId: "singleton",
        details: { feeRate, tierCount: tiers.length, tiers },
      },
    }),
  ]);

  const config = await loadPricingConfig();
  return NextResponse.json({ ok: true, feeRate: config.feeRate, tiers: config.tiers, usingDefaultTiers: config.usingDefaultTiers });
}

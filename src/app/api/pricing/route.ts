import { NextResponse } from "next/server";
import { loadPricingConfig } from "@/server/pricing-config";
import { fromCents, toCents } from "@/server/pricing-grid";

export const dynamic = "force-dynamic";

// Public : la grille et le taux de commission sont des informations affichées aux utilisateurs
// (formulaires de colis et de trajet). Montants tout compris, payés par l'expéditeur.
export async function GET() {
  const config = await loadPricingConfig();
  return NextResponse.json({
    feeRate: config.feeRate,
    tiers: config.tiers
      .filter((t) => t.active !== false)
      .map((t) => {
        // Les montants publiés incluent déjà le supplément éventuel : c'est ce que voit l'utilisateur.
        const extra = toCents(t.surcharge ?? 0);
        return {
          label: t.label ?? null,
          originCountry: t.originCountry ?? null,
          destinationCountry: t.destinationCountry ?? null,
          minWeightKg: t.minWeightKg,
          maxWeightKg: t.maxWeightKg,
          minPrice: fromCents(toCents(t.minPrice) + extra),
          recommendedMin: fromCents(toCents(t.recommendedMin) + extra),
          recommendedMax: fromCents(toCents(t.recommendedMax) + extra),
        };
      }),
  });
}

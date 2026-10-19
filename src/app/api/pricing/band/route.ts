import { NextResponse } from "next/server";
import { bandFromConfig, loadPricingConfig } from "@/server/pricing-config";
import { countryFromLabel } from "@/server/pricing-grid";

export const dynamic = "force-dynamic";

// Public : minimum autorisé et fourchette conseillée pour un poids (et, si connus, les villes de
// départ/arrivée dont on déduit le pays). Utilisé par les formulaires pour afficher le prix en direct ;
// la même règle est ré-appliquée côté serveur à chaque offre, réservation et paiement.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const weightKg = Number(searchParams.get("weightKg"));
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return NextResponse.json({ error: "weightKg doit être un nombre positif" }, { status: 400 });
  }

  const config = await loadPricingConfig();
  const band = bandFromConfig(config, weightKg, {
    originCountry: countryFromLabel(searchParams.get("originLabel")),
    destinationCountry: countryFromLabel(searchParams.get("destinationLabel")),
  });
  if (!band) return NextResponse.json({ error: "Poids invalide" }, { status: 400 });
  return NextResponse.json({ ...band, feeRate: config.feeRate });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/admin";
import { alignPrices } from "@/server/pricing-align";

export const dynamic = "force-dynamic";

// Met les anciens prix (créés avant la grille) en conformité. `apply: false` (défaut) = aperçu seul.
// Ne touche jamais une réservation payée ou en cours : seulement trajets ouverts et demandes non payées.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Seul un administrateur peut modifier les tarifs" }, { status: 403 });
  }
  const parsed = z.object({ apply: z.boolean().default(false) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  return NextResponse.json(await alignPrices({ apply: parsed.data.apply, adminId: admin.id }));
}

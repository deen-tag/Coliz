import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { respondToOffer } from "@/server/negotiation-service";

const bodySchema = z.object({ action: z.enum(["accept", "reject"]) });

// Réponse à une offre en attente : accepter (le prix de la réservation est alors mis à jour)
// ou refuser. Pour contre-proposer, envoyer une nouvelle offre (POST /offers).
export async function POST(req: Request, { params }: { params: { id: string; offerId: string } }) {
  const user = await requireUser();
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Action invalide", code: "INVALID" }, { status: 400 });

  const result = await respondToOffer(params.id, params.offerId, user.id, parsed.data.action);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code, minPrice: result.minPrice }, { status: result.status });
  }
  return NextResponse.json({ ok: true, status: result.data.status });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { createOffer } from "@/server/negotiation-service";

// Un prix TOUT COMPRIS (payé par l'expéditeur). Le contrôle du minimum se fait dans le service.
const bodySchema = z.object({ amount: z.number() });

// Propose un prix, ou fait une contre-proposition si l'autre partie a une offre en attente.
// Le prix de la réservation ne change qu'à l'acceptation de l'offre par l'autre partie.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Saisissez un montant valide en euros.", code: "INVALID" }, { status: 400 });
  }

  const result = await createOffer(params.id, user.id, parsed.data.amount);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code, minPrice: result.minPrice }, { status: result.status });
  }
  return NextResponse.json({ ok: true, offerId: result.data.offer.id, amount: result.data.amount }, { status: 201 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { notifyUser } from "@/server/notifications/service";

const bodySchema = z.object({
  description: z.string().min(5).max(1000).default("Réceptionniste injoignable ou absent au point de rendez-vous."),
});

// Le voyageur ne peut PAS déclarer "livré" sans code. S'il ne trouve
// personne à l'arrivée, ce chemin l'oblige à passer par un incident tracé
// au lieu de rester bloqué ou de contourner la vérification (cf. cahier
// des charges §12 : "aucun état d'erreur ne doit se terminer sans action
// proposée à l'utilisateur").
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.travelerId !== user.id) {
    return NextResponse.json({ error: "Seul le voyageur peut signaler ce problème" }, { status: 403 });
  }
  if (booking.status !== "PICKED_UP") {
    return NextResponse.json(
      { error: `Impossible de signaler un problème de livraison depuis l'état ${booking.status}` },
      { status: 422 }
    );
  }

  const [, incident] = await prisma.$transaction([
    prisma.booking.update({ where: { id: booking.id }, data: { status: "DELIVERY_FAILED" } }),
    prisma.incident.create({
      data: {
        bookingId: booking.id,
        reporterId: user.id,
        category: "retard",
        description: parsed.data.description,
      },
    }),
    prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        type: "DELIVERY_ISSUE_REPORTED",
        actorId: user.id,
        actorRole: "TRAVELER",
        metadata: { description: parsed.data.description },
      },
    }),
  ]);

  // Le colis reste chez le voyageur, la rémunération reste en attente —
  // pas d'indemnisation ni de dénouement automatique (cf. audit initial).
  await notifyUser(
    booking.senderId,
    "incident_action_required",
    "Le voyageur n'a pas pu remettre le colis au réceptionniste. Un incident a été ouvert."
  );

  return NextResponse.json({ ok: true, status: "DELIVERY_FAILED", incidentId: incident.id });
}

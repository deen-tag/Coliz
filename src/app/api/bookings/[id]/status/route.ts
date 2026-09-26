import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { notifyUser } from "@/server/notifications/service";
import { transferToTraveler } from "@/server/stripe/transfer";

// Transitions autorisées : on empêche de sauter des étapes ou de revenir en arrière.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  CONFIRMED: ["IN_PROGRESS"], // prise en charge du colis
  IN_PROGRESS: ["COMPLETED"], // livraison confirmée
};

const PARCEL_STATUS_BY_BOOKING_STATUS: Record<string, string> = {
  IN_PROGRESS: "IN_TRANSIT",
  COMPLETED: "DELIVERED",
};

const statusSchema = z.object({ status: z.enum(["IN_PROGRESS", "COMPLETED"]) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.travelerId !== user.id) {
    return NextResponse.json({ error: "Seul le voyageur peut mettre à jour le suivi" }, { status: 403 });
  }

  const allowedNext = ALLOWED_TRANSITIONS[booking.status] ?? [];
  if (!allowedNext.includes(parsed.data.status)) {
    return NextResponse.json({ error: `Transition ${booking.status} → ${parsed.data.status} non autorisée` }, { status: 422 });
  }

  await prisma.$transaction([
    prisma.booking.update({ where: { id: booking.id }, data: { status: parsed.data.status } }),
    prisma.parcel.update({
      where: { id: booking.parcelId },
      data: { status: PARCEL_STATUS_BY_BOOKING_STATUS[parsed.data.status] as any },
    }),
  ]);

  await notifyUser(
    booking.senderId,
    parsed.data.status === "IN_PROGRESS" ? "parcel_picked_up" : "delivery_confirmed",
    parsed.data.status === "IN_PROGRESS" ? "Votre colis a été pris en charge." : "Votre colis a été livré."
  );

  // Règle métier Coliz : le transfert vers le voyageur est déclenché à la
  // livraison confirmée (et non à la réservation), pour limiter le risque litige.
  if (parsed.data.status === "COMPLETED") {
    await transferToTraveler(booking.id);
  }

  return NextResponse.json({ ok: true });
}

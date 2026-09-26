import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeBookingAmounts } from "@/server/stripe/client";
import { requireUser } from "@/server/auth/session";
import { notifyUser } from "@/server/notifications/service";

const bookingSchema = z.object({
  parcelId: z.string(),
  tripId: z.string(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [parcel, trip] = await Promise.all([
    prisma.parcel.findUnique({ where: { id: parsed.data.parcelId } }),
    prisma.trip.findUnique({ where: { id: parsed.data.tripId } }),
  ]);

  if (!parcel || !trip) {
    return NextResponse.json({ error: "Colis ou trajet introuvable" }, { status: 404 });
  }
  if (parcel.senderId !== user.id) {
    return NextResponse.json({ error: "Ce colis ne vous appartient pas" }, { status: 403 });
  }
  if (trip.remainingParcels < parcel.parcelCount) {
    return NextResponse.json({ error: "Capacité insuffisante sur ce trajet" }, { status: 422 });
  }

  const { contributionAmount, platformFeeAmount, totalAmount } = computeBookingAmounts(
    Number(trip.contributionAmount)
  );

  const booking = await prisma.booking.create({
    data: {
      parcelId: parcel.id,
      tripId: trip.id,
      senderId: user.id,
      travelerId: trip.travelerId,
      contributionAmount,
      platformFeeAmount,
      totalAmount,
      status: "REQUESTED",
    },
  });

  await notifyUser(trip.travelerId, "booking_requested", `Nouvelle demande de réservation pour votre trajet.`);

  return NextResponse.json(booking, { status: 201 });
}

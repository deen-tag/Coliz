import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeBookingAmounts } from "@/server/stripe/client";
import { requireUser } from "@/server/auth/session";
import { notifyUser } from "@/server/notifications/service";
import { reserveCapacity } from "@/server/bookings/capacity";

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

  // Réservation de la place et création de la demande dans la même transaction :
  // si la capacité vient de se remplir entre-temps, rien n'est créé.
  const booking = await prisma.$transaction(async (tx) => {
    const reserved = await reserveCapacity(tx, trip.id, parcel.parcelCount);
    if (!reserved) return null;
    return tx.booking.create({
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
  });
  if (!booking) {
    return NextResponse.json({ error: "Capacité insuffisante sur ce trajet" }, { status: 422 });
  }

  await notifyUser(trip.travelerId, "booking_requested", `Nouvelle demande de réservation pour votre trajet.`);

  return NextResponse.json(booking, { status: 201 });
}

// Liste des réservations de l'utilisateur, côté expéditeur ou voyageur —
// nécessaire pour l'écran /reservations (hub "Activité").
export async function GET() {
  const user = await requireUser();
  const bookings = await prisma.booking.findMany({
    where: { OR: [{ senderId: user.id }, { travelerId: user.id }] },
    orderBy: { createdAt: "desc" },
    include: {
      parcel: { select: { originLabel: true, destinationLabel: true } },
      trip: { select: { originLabel: true, destinationLabel: true, departureAt: true, mode: true } },
      sender: { select: { id: true, firstName: true } },
      traveler: { select: { id: true, firstName: true } },
    },
  });

  return NextResponse.json(
    bookings.map((b) => ({
      id: b.id,
      status: b.status,
      totalAmount: b.totalAmount,
      contributionAmount: b.contributionAmount,
      createdAt: b.createdAt,
      role: b.senderId === user.id ? "sender" : "traveler",
      counterpart: b.senderId === user.id ? b.traveler.firstName : b.sender.firstName,
      originLabel: b.trip.originLabel,
      destinationLabel: b.trip.destinationLabel,
      departureAt: b.trip.departureAt,
      mode: b.trip.mode,
    }))
  );
}

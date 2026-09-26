import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";

export async function GET() {
  const user = await requireUser();

  const [activeParcels, activeTrips, unreadNotifications, wallet] = await Promise.all([
    prisma.parcel.findMany({
      where: { senderId: user.id, status: { notIn: ["CLOSED", "CANCELLED", "DRAFT"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.trip.findMany({
      where: { travelerId: user.id, status: { notIn: ["ARCHIVED", "CANCELLED"] } },
      orderBy: { departureAt: "asc" },
      take: 5,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.wallet.findUnique({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    activeParcels,
    activeTrips,
    unreadNotifications,
    walletAvailable: wallet?.availableAmount ?? 0,
  });
}

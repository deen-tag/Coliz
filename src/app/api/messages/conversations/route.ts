import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";

export async function GET() {
  const user = await requireUser();

  const bookings = await prisma.booking.findMany({
    where: { OR: [{ senderId: user.id }, { travelerId: user.id }] },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      sender: { select: { id: true, firstName: true, avatarUrl: true } },
      traveler: { select: { id: true, firstName: true, avatarUrl: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      parcel: { select: { originLabel: true, destinationLabel: true } },
    },
  });

  const conversations = bookings.map((b) => {
    const other = b.senderId === user.id ? b.traveler : b.sender;
    return {
      bookingId: b.id,
      otherUser: other,
      route: `${b.parcel.originLabel} → ${b.parcel.destinationLabel}`,
      lastMessage: b.messages[0]?.content ?? null,
      lastMessageAt: b.messages[0]?.createdAt ?? null,
    };
  });

  return NextResponse.json(conversations);
}

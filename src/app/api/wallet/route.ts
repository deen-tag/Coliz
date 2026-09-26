import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";

export async function GET() {
  const user = await requireUser();

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });

  const transactions = await prisma.transaction.findMany({
    where: {
      booking: { travelerId: user.id },
      type: { in: ["TRANSFER_TO_TRAVELER", "PAYOUT"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { booking: { select: { id: true, parcelId: true } } },
  });

  return NextResponse.json({
    availableAmount: wallet?.availableAmount ?? 0,
    pendingAmount: wallet?.pendingAmount ?? 0,
    transactions,
  });
}

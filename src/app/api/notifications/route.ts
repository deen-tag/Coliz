import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";

export async function GET() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(notifications);
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  const { id, all } = await req.json();
  await prisma.notification.updateMany({
    where: all ? { userId: user.id, readAt: null } : { id, userId: user.id },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

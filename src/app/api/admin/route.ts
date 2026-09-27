import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/admin";

export const dynamic = "force-dynamic";

// Tableau de bord synthétique — écran 18 du cahier des charges.
// Volontairement limité à quelques compteurs + incidents ouverts : le
// back-office ne doit pas devenir un dashboard surchargé (contrainte design V2).
export async function GET() {
  await requireAdmin();

  const [openIncidents, activeUsers, bookingsToday, gmvThisMonth] = await Promise.all([
    prisma.incident.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.booking.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.transaction.aggregate({
      where: { type: "PAYMENT_INTENT", status: "SUCCEEDED", createdAt: { gte: new Date(new Date().setDate(1)) } },
      _sum: { amount: true },
    }),
  ]);

  const recentIncidents = await prisma.incident.findMany({
    where: { status: { in: ["OPEN", "IN_REVIEW"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { reporter: { select: { firstName: true, lastName: true } } },
  });

  return NextResponse.json({
    counters: { openIncidents, activeUsers, bookingsToday, gmvThisMonth: gmvThisMonth._sum.amount ?? 0 },
    recentIncidents,
  });
}

const suspendSchema = z.object({ userId: z.string(), action: z.enum(["SUSPEND", "REACTIVATE"]), reason: z.string().optional() });

export async function POST(req: Request) {
  const admin = await requireAdmin();
  const body = await req.json();
  const parsed = suspendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: parsed.data.userId },
      data: { status: parsed.data.action === "SUSPEND" ? "SUSPENDED" : "ACTIVE" },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: parsed.data.action,
        targetType: "User",
        targetId: parsed.data.userId,
        details: { reason: parsed.data.reason },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

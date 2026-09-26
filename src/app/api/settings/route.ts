import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { getVerificationSummary } from "@/server/auth/verification";

export async function GET() {
  const user = await requireUser();
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  return NextResponse.json({
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    email: dbUser.email,
    phone: dbUser.phone,
    bio: dbUser.bio,
    notifyEmail: dbUser.notifyEmail,
    notifyPush: dbUser.notifyPush,
    language: dbUser.language,
    verification: getVerificationSummary(dbUser),
  });
}

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  notifyEmail: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
  language: z.enum(["fr", "en", "ar"]).optional(),
});

export async function PATCH(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  return NextResponse.json({ ok: true, updated: parsed.data, id: updated.id });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const u = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return NextResponse.json({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      role: u.role,
      identityVerified: Boolean(u.identityVerifiedAt),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

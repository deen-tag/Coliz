import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { signMobileToken } from "@/server/auth/mobile-token";

export const dynamic = "force-dynamic";

// Renouvelle le jeton (appelé à chaque ouverture de l'app) : un utilisateur actif
// reste connecté, un compte suspendu ou un mot de passe changé coupe l'accès.
export async function POST() {
  try {
    const user = await requireUser();
    const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return NextResponse.json({ token: await signMobileToken(dbUser) });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

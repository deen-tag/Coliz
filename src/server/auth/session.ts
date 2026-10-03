import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { authOptions } from "./options";
import { verifyMobileToken, passwordVersion } from "./mobile-token";
import { prisma } from "@/lib/prisma";

function unauthorized(): never {
  throw new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401 });
}

// Identifie l'utilisateur de la requête :
// - application mobile : en-tête "Authorization: Bearer <jeton>"
// - site web : cookie de session NextAuth (comportement d'origine, inchangé)
export async function requireUser() {
  const authorization = headers().get("authorization");
  if (authorization && /^bearer /i.test(authorization)) {
    const payload = await verifyMobileToken(authorization.slice(7).trim());
    if (!payload) unauthorized();
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true, status: true, passwordHash: true },
    });
    if (!dbUser || dbUser.status !== "ACTIVE" || passwordVersion(dbUser.passwordHash) !== payload.pv) {
      unauthorized();
    }
    return { id: dbUser.id, email: dbUser.email, role: dbUser.role as string };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) unauthorized();
  return session.user as { id: string; email: string; role: string };
}

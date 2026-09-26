import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";

export async function requireAdmin() {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "MODERATOR")) {
    throw new Response(JSON.stringify({ error: "Accès réservé aux administrateurs" }), { status: 403 });
  }
  return dbUser;
}

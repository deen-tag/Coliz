import { getServerSession } from "next-auth";
import { authOptions } from "./options";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401 });
  }
  return session.user as { id: string; email: string; role: string };
}

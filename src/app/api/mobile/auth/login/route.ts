import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signMobileToken } from "@/server/auth/mobile-token";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email(), password: z.string().min(1).max(200) });

// Freinage basique des tentatives (en mémoire : suffisant contre un essai manuel,
// à remplacer par Upstash/Redis si vous voulez une protection solide en production).
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function tooMany(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) return false;
  return entry.count >= MAX_ATTEMPTS;
}
function registerFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
}

const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.VQfzF0g0o1ZQ9yq1p5oHq8zq0y3K";

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Email ou mot de passe invalide." }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `${ip}|${email}`;
  if (tooMany(key)) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Toujours faire un bcrypt.compare pour ne pas révéler si l'email existe (temps de réponse).
  const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || user.status !== "ACTIVE") {
    registerFailure(key);
    return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
  }

  attempts.delete(key);
  const token = await signMobileToken(user);
  return NextResponse.json({
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl, role: user.role },
  });
}

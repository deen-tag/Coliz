import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/server/notifications/email";
import { generateResetToken, hashResetToken, RESET_TOKEN_TTL_MS } from "@/server/security/password-reset";

const schema = z.object({ email: z.string().email() });

// Réponse identique que l'email existe ou non : on ne révèle jamais
// quelles adresses ont un compte.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Email invalide." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });

  if (user && user.status === "ACTIVE") {
    // Un seul lien actif à la fois : on invalide les précédents non utilisés.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = generateResetToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });

    const url = `${process.env.NEXT_PUBLIC_APP_URL}/reinitialiser-mot-de-passe/${token}`;
    const tpl = emailTemplates.passwordReset(url);
    try {
      await sendEmail(user.email, tpl.subject, tpl.html);
    } catch {
      // ne jamais faire échouer (ni différencier) la réponse
    }
  }

  return NextResponse.json({ ok: true });
}

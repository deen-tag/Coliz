import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(10).max(300).regex(/^(Expo|Exponent)PushToken\[.+\]$/, "Jeton push invalide"),
  platform: z.enum(["ios", "android"]),
});

// Enregistre l'appareil pour les notifications push. Un même téléphone peut changer de compte :
// le jeton est donc rattaché au dernier utilisateur connecté.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Jeton push invalide" }, { status: 400 });
    await prisma.pushToken.upsert({
      where: { token: parsed.data.token },
      create: { token: parsed.data.token, platform: parsed.data.platform, userId: user.id },
      update: { userId: user.id, platform: parsed.data.platform },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// À la déconnexion : cet appareil ne doit plus recevoir les notifications de ce compte.
export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const parsed = z.object({ token: z.string() }).safeParse(await req.json().catch(() => null));
    if (parsed.success) {
      await prisma.pushToken.deleteMany({ where: { token: parsed.data.token, userId: user.id } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

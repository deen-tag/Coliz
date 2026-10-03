import { createHash } from "crypto";
import { encode, decode } from "next-auth/jwt";

// Jeton d'accès de l'application mobile.
// On réutilise le secret NextAuth existant (aucune nouvelle clé à gérer) mais le jeton
// est envoyé dans l'en-tête "Authorization: Bearer ..." au lieu d'un cookie.
// Le champ `pv` est une empreinte du mot de passe actuel : si le mot de passe change
// (ex. réinitialisation), tous les anciens jetons mobiles deviennent invalides.

export const MOBILE_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 jours, renouvelé à chaque ouverture de l'app

function secret() {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET manquant");
  return s;
}

export function passwordVersion(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

export async function signMobileToken(user: { id: string; role: string; passwordHash: string }) {
  return encode({
    token: { id: user.id, sub: user.id, role: user.role, mobile: true, pv: passwordVersion(user.passwordHash) },
    secret: secret(),
    maxAge: MOBILE_TOKEN_TTL_SECONDS,
  });
}

export type MobileTokenPayload = { id: string; role: string; pv: string };

export async function verifyMobileToken(token: string): Promise<MobileTokenPayload | null> {
  try {
    const payload = await decode({ token, secret: secret() });
    if (!payload || payload.mobile !== true || typeof payload.id !== "string" || typeof payload.pv !== "string") {
      return null;
    }
    return { id: payload.id, role: String(payload.role ?? "USER"), pv: payload.pv };
  } catch {
    return null; // expiré, falsifié, etc.
  }
}

import crypto from "crypto";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

export function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Hash à sens unique : seul le hash est stocké, jamais le token en clair.
export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

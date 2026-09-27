import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Codes de remise / réception — voir prisma/schema.prisma pour le principe
 * général (les deux codes appartiennent à l'expéditeur du début à la fin,
 * qui les consulte via GET /pickup-code et GET /delivery-code aussi souvent
 * qu'il le souhaite).
 *
 * Choix cryptographique : AES-256-GCM (réversible), PAS un hash à sens unique.
 * L'expéditeur doit pouvoir revoir son code à tout moment (pour le transmettre
 * en personne au voyageur, puis plus tard au réceptionniste) — un hash rendrait
 * ça impossible. Le code en clair n'est en revanche jamais loggé, jamais mis
 * dans une metadata de BookingEvent, et la clé de chiffrement (TRANSFER_CODE_KEY)
 * est distincte du reste des secrets applicatifs.
 */

const RAW_KEY = process.env.TRANSFER_CODE_KEY;
if (!RAW_KEY || Buffer.from(RAW_KEY, "hex").length !== 32) {
  throw new Error(
    "TRANSFER_CODE_KEY manquant ou invalide — attendu : 32 octets en hexadécimal (64 caractères). " +
      "Générer avec `openssl rand -hex 32`. Obligatoire pour chiffrer/déchiffrer les codes de remise et réception."
  );
}
const KEY = Buffer.from(RAW_KEY, "hex");

const CODE_LENGTH = 6;
const DEFAULT_MAX_ATTEMPTS = 5;

// Fenêtres de validité — volontairement généreuses car un trajet Europe↔Maghreb
// peut glisser de plusieurs jours. À ajuster avec le produit si besoin.
const PICKUP_VALIDITY_DAYS = 14;
const DELIVERY_VALIDITY_DAYS = 30;

function generateNumericCode(): string {
  const max = 10 ** CODE_LENGTH;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(CODE_LENGTH, "0");
}

function encryptCode(code: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv.ciphertext.authTag, tout en base64, pour tenir dans un seul champ texte
  return [iv, ciphertext, authTag].map((b) => b.toString("base64")).join(".");
}

function decryptCode(cipherField: string): string {
  const [ivB64, ciphertextB64, authTagB64] = cipherField.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/**
 * Génère les deux codes (PICKUP + DELIVERY) pour un booking qui vient
 * d'être confirmé (paiement réussi). Appelé une seule fois côté système,
 * jamais à la demande d'un utilisateur — c'est `getPlaintextCode` ci-dessous
 * qui permet à l'expéditeur de les revoir ensuite.
 */
export async function issueTransferCodes(bookingId: string) {
  const now = new Date();

  await prisma.$transaction([
    prisma.transferCode.create({
      data: {
        bookingId,
        purpose: "PICKUP",
        codeCipher: encryptCode(generateNumericCode()),
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        expiresAt: new Date(now.getTime() + PICKUP_VALIDITY_DAYS * 86400_000),
      },
    }),
    prisma.transferCode.create({
      data: {
        bookingId,
        purpose: "DELIVERY",
        codeCipher: encryptCode(generateNumericCode()),
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        expiresAt: new Date(now.getTime() + DELIVERY_VALIDITY_DAYS * 86400_000),
      },
    }),
    prisma.bookingEvent.create({ data: { bookingId, type: "PICKUP_CODE_ISSUED", actorRole: "SYSTEM" } }),
    prisma.bookingEvent.create({ data: { bookingId, type: "DELIVERY_CODE_ISSUED", actorRole: "SYSTEM" } }),
  ]);
}

/**
 * Réservé aux routes appelées par l'expéditeur (vérification senderId faite
 * en amont). Renvoie le code actif en clair, ou null s'il n'y en a pas
 * (déjà vérifié, expiré, verrouillé — l'appelant décide quoi afficher).
 */
export async function getPlaintextCode(bookingId: string, purpose: "PICKUP" | "DELIVERY") {
  const record = await prisma.transferCode.findFirst({
    where: { bookingId, purpose, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return null;
  if (record.expiresAt < new Date()) return null;
  return { code: decryptCode(record.codeCipher), expiresAt: record.expiresAt };
}

type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "LOCKED" | "INVALID_CODE" };

/**
 * Vérifie un code saisi par le voyageur. Ne fait AUCUNE supposition sur le
 * statut du booking — c'est aux routes appelantes de vérifier que
 * travelerId === utilisateur courant et que le booking est dans le bon état
 * avant d'appeler cette fonction.
 */
export async function verifyTransferCode(
  bookingId: string,
  purpose: "PICKUP" | "DELIVERY",
  submittedCode: string,
  verifiedById: string
): Promise<VerifyResult> {
  const record = await prisma.transferCode.findFirst({
    where: { bookingId, purpose, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, reason: "NOT_FOUND" };

  if (record.expiresAt < new Date()) {
    await prisma.transferCode.update({ where: { id: record.id }, data: { status: "EXPIRED" } });
    return { ok: false, reason: "EXPIRED" };
  }

  let candidate: string;
  try {
    candidate = decryptCode(record.codeCipher);
  } catch {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const match =
    candidate.length === submittedCode.trim().length &&
    crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(submittedCode.trim()));

  if (!match) {
    const attemptsCount = record.attemptsCount + 1;
    const lockedOut = attemptsCount >= record.maxAttempts;

    await prisma.$transaction([
      prisma.transferCode.update({
        where: { id: record.id },
        data: { attemptsCount, status: lockedOut ? "LOCKED" : "ACTIVE" },
      }),
      prisma.bookingEvent.create({
        data: {
          bookingId,
          type: purpose === "PICKUP" ? "PICKUP_CODE_ATTEMPT_FAILED" : "DELIVERY_CODE_ATTEMPT_FAILED",
          actorId: verifiedById,
          actorRole: "TRAVELER",
          metadata: { attemptsCount, lockedOut },
        },
      }),
    ]);

    return { ok: false, reason: lockedOut ? "LOCKED" : "INVALID_CODE" };
  }

  await prisma.$transaction([
    prisma.transferCode.update({
      where: { id: record.id },
      data: { status: "VERIFIED", verifiedAt: new Date(), verifiedById },
    }),
    prisma.bookingEvent.create({
      data: {
        bookingId,
        type: purpose === "PICKUP" ? "PICKUP_CODE_VERIFIED" : "DELIVERY_CODE_VERIFIED",
        actorId: verifiedById,
        actorRole: "TRAVELER",
      },
    }),
  ]);

  return { ok: true };
}

/**
 * Régénère un code EXPIRED ou LOCKED. Seul l'expéditeur peut demander ça
 * (vérifié par la route appelante). L'ancien est révoqué : il ne redevient
 * jamais valide, même si l'ancienne valeur était correcte.
 */
export async function regenerateTransferCode(bookingId: string, purpose: "PICKUP" | "DELIVERY") {
  const current = await prisma.transferCode.findFirst({
    where: { bookingId, purpose },
    orderBy: { createdAt: "desc" },
  });
  if (current && current.status === "ACTIVE" && current.expiresAt > new Date()) {
    throw new Error("Le code actuel est encore valide, pas besoin de régénérer.");
  }

  const validityDays = purpose === "PICKUP" ? PICKUP_VALIDITY_DAYS : DELIVERY_VALIDITY_DAYS;

  await prisma.$transaction([
    ...(current
      ? [prisma.transferCode.update({ where: { id: current.id }, data: { status: "REVOKED" as const } })]
      : []),
    prisma.transferCode.create({
      data: {
        bookingId,
        purpose,
        codeCipher: encryptCode(generateNumericCode()),
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        expiresAt: new Date(Date.now() + validityDays * 86400_000),
      },
    }),
    prisma.bookingEvent.create({
      data: { bookingId, type: "CODE_REGENERATED", actorRole: "SENDER", metadata: { purpose } },
    }),
  ]);
}

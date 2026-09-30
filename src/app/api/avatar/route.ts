import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { deleteAvatarBlob } from "@/server/avatar";

export const dynamic = "force-dynamic";

// Limite serveur Vercel ≈ 4,5 Mo par requête : on reste en dessous.
// (Côté navigateur la photo est réduite avant l'envoi, donc on est très loin de la limite.)
const MAX_BYTES = 4 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// On vérifie le contenu réel du fichier, pas seulement ce que le navigateur déclare.
function detectImageType(buf: Buffer): string | null {
  if (buf.length > 12) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
    if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP")
      return "image/webp";
  }
  return null;
}

async function currentUser() {
  try {
    return await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (user instanceof Response) return user;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucune image reçue" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image trop lourde (4 Mo maximum)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = detectImageType(buffer);
  if (!mime) {
    return NextResponse.json({ error: "Format non pris en charge (JPG, PNG ou WebP)" }, { status: 400 });
  }

  const previous = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });

  const blob = await put(`avatars/${user.id}.${EXTENSIONS[mime]}`, buffer, {
    access: "public",
    addRandomSuffix: true, // nouvelle URL à chaque changement : pas de photo en cache périmée
    contentType: mime,
  });

  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: blob.url } });
  await deleteAvatarBlob(previous?.avatarUrl);

  return NextResponse.json({ avatarUrl: blob.url });
}

export async function DELETE() {
  const user = await currentUser();
  if (user instanceof Response) return user;

  const previous = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  await deleteAvatarBlob(previous?.avatarUrl);

  return NextResponse.json({ avatarUrl: null });
}

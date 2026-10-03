import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

// Photo d'un colis (prise avec la caméra ou choisie dans la galerie de l'app mobile).
// Même contrôle du contenu réel que pour les photos de profil (/api/avatar).
const MAX_BYTES = 4 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function detectImageType(buf: Buffer): string | null {
  if (buf.length > 12) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
    if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  }
  return null;
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Aucune image reçue" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image trop lourde (4 Mo maximum)" }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = detectImageType(buffer);
  if (!mime) return NextResponse.json({ error: "Format non pris en charge (JPG, PNG ou WebP)" }, { status: 400 });

  const blob = await put(`parcels/${user.id}/photo.${EXTENSIONS[mime]}`, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: mime,
  });
  return NextResponse.json({ url: blob.url });
}

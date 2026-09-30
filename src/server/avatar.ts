import { del } from "@vercel/blob";

// Supprime l'ancienne photo du stockage Vercel Blob.
// Sécurité : on ne supprime que nos propres fichiers d'avatar (jamais une URL externe).
export async function deleteAvatarBlob(url?: string | null) {
  if (!url) return;
  try {
    const { hostname, pathname } = new URL(url);
    const isOurBlob = hostname.endsWith(".public.blob.vercel-storage.com") && pathname.startsWith("/avatars/");
    if (!isOurBlob) return;
    await del(url);
  } catch (err) {
    // Un échec de nettoyage ne doit jamais bloquer l'utilisateur.
    console.error("Suppression de l'ancien avatar impossible", err);
  }
}

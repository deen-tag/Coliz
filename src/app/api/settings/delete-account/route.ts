import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { deleteAvatarBlob } from "@/server/avatar";

/**
 * On ne fait pas de suppression physique immédiate : les réservations, transactions
 * et avis doivent être conservés (comptabilité, litiges, obligations légales).
 * On désactive le compte et on anonymise les informations non indispensables.
 * Un vrai processus RGPD (purge différée après délai légal) est à formaliser
 * avec un juriste avant mise en prod — ceci est la mécanique technique de base.
 */
export async function POST() {
  const user = await requireUser();
  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: "DEACTIVATED",
      bio: null,
      avatarUrl: null,
      phone: null,
    },
  });

  // La photo est aussi supprimée du stockage (pas seulement détachée du compte).
  await deleteAvatarBlob(current?.avatarUrl);

  return NextResponse.json({ ok: true });
}

// ROUTE TEMPORAIRE — à supprimer juste après usage (voir commandes Termux).
// Recrée les données de démo : nouveaux comptes @demo.coliz + 50 trajets + 50 colis (bulk-data.ts).
// Ne touche JAMAIS aux vrais comptes (seuls les emails @demo.coliz sont concernés)
// ni aux trajets/colis qui ont déjà une réservation.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { buildParcels, buildTrips, demoAvatars, demoUsers, EXISTING_TRAVELER_EMAILS } from "@/server/demo/bulk-data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SECRET = "coliz-demo-v2-k4p8x";
const DEMO_PASSWORD = "Demo1234!";

// Donne un visage aux comptes de démo. Ne touche QUE les comptes qui n'ont pas déjà de photo :
// une photo envoyée par une vraie personne (ou par toi en test) n'est jamais écrasée.
async function applyAvatars() {
  const entries = Object.entries(demoAvatars());
  const results = await Promise.all(
    entries.map(([email, avatarUrl]) => prisma.user.updateMany({ where: { email, avatarUrl: null }, data: { avatarUrl } }))
  );
  return { updated: results.reduce((n, r) => n + r.count, 0), total: entries.length };
}

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (key !== SECRET) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // ?only=avatars : ajoute uniquement les visages, sans recréer les trajets ni les colis.
  if (new URL(req.url).searchParams.get("only") === "avatars") {
    return NextResponse.json({ ok: true, avatars: await applyAvatars() });
  }

  const users = demoUsers();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = new Date();

  // 1) Comptes voyageurs et expéditeurs (créés ou mis à jour, jamais dupliqués)
  const travelerIds: string[] = [];
  for (const t of users.travelers) {
    const data = {
      firstName: t.firstName,
      lastName: t.lastName,
      emailVerifiedAt: now,
      identityVerifiedAt: t.verified ? now : null,
      ratingCount: t.ratingCount,
      ratingAverage: t.ratingAverage,
      status: "ACTIVE" as const,
    };
    const u = await prisma.user.upsert({
      where: { email: t.email },
      update: data,
      create: { email: t.email, passwordHash, ...data },
    });
    travelerIds.push(u.id);
  }

  // Voyageurs déjà existants (Karim, Sofia...) : ils restent tels quels et reçoivent aussi des trajets.
  const existing = await prisma.user.findMany({ where: { email: { in: EXISTING_TRAVELER_EMAILS } } });
  for (const email of EXISTING_TRAVELER_EMAILS) {
    const u = existing.find((x) => x.email === email);
    if (u) travelerIds.push(u.id);
  }

  const senderIds: string[] = [];
  for (const s of users.senders) {
    const data = { firstName: s.firstName, lastName: s.lastName, emailVerifiedAt: now, status: "ACTIVE" as const };
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: data,
      create: { email: s.email, passwordHash, ...data },
    });
    senderIds.push(u.id);
  }

  // 2) Purge des anciens trajets/colis de démo SANS réservation (les réservations existantes sont conservées)
  const deletedTrips = await prisma.trip.deleteMany({
    where: { traveler: { email: { endsWith: "@demo.coliz" } }, bookings: { none: {} } },
  });
  const deletedParcels = await prisma.parcel.deleteMany({
    where: { sender: { email: { endsWith: "@demo.coliz" } }, bookings: { none: {} } },
  });

  // 3) Création des 50 trajets et 50 colis
  const trips = buildTrips(now, travelerIds.length);
  const parcels = buildParcels(trips, senderIds.length);

  const createdTrips = await prisma.trip.createMany({
    data: trips.map(({ travelerIndex, ...t }) => ({ ...t, travelerId: travelerIds[travelerIndex] })),
  });
  const createdParcels = await prisma.parcel.createMany({
    data: parcels.map(({ senderIndex, ...p }) => ({
      ...p,
      senderId: senderIds[senderIndex],
      parcelCount: 1,
      prohibitedItemsAccepted: true,
      status: "SEARCHING" as const,
    })),
  });

  const avatars = await applyAvatars();

  return NextResponse.json({
    ok: true,
    avatars,
    travelersAvailable: travelerIds.length,
    sendersAvailable: senderIds.length,
    deleted: { trips: deletedTrips.count, parcels: deletedParcels.count },
    created: { trips: createdTrips.count, parcels: createdParcels.count },
  });
}

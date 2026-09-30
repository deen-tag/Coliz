import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { EXISTING_TRAVELER_EMAILS, buildParcels, buildTrips, demoUsers } from "@/server/demo/bulk-data";

export const dynamic = "force-dynamic";

// ROUTE TEMPORAIRE — à supprimer après usage (voir README, méthode "route temporaire").
// Crée des voyageurs/expéditeurs démo (@demo.coliz, mot de passe Demo1234!), 50 trajets et 50 colis cohérents.
// Usage : /api/admin/seed-demo-bulk-temp?key=coliz-bulk-4t8q1   (ajouter &force=1 pour relancer)
const SECRET = "coliz-bulk-4t8q1";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("key") !== SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Garde-fou contre un double lancement (doublons de trajets).
  const already = await prisma.trip.count({ where: { traveler: { email: { endsWith: "@demo.coliz" } } } });
  if (already > 30 && searchParams.get("force") !== "1") {
    return NextResponse.json(
      { error: `Déjà ${already} trajets démo en base. Ajoutez &force=1 pour relancer quand même.` },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash("Demo1234!", 10);
  const users = demoUsers();

  const upsertUser = (u: { email: string; firstName: string; lastName: string; verified?: boolean; ratingCount?: number; ratingAverage?: number }) =>
    prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        emailVerifiedAt: new Date(),
        identityVerifiedAt: u.verified ? new Date() : null,
        ratingCount: u.ratingCount ?? 0,
        ratingAverage: u.ratingAverage ?? 0,
        wallet: { create: {} },
      },
    });

  const newTravelers = [];
  for (const t of users.travelers) newTravelers.push(await upsertUser(t));
  const senders = [];
  for (const s of users.senders) senders.push(await upsertUser(s));

  // Voyageurs déjà en base (Karim, Sofia, Yanis, Nour, Amine, Lina) + les nouveaux.
  const existing = await prisma.user.findMany({ where: { email: { in: EXISTING_TRAVELER_EMAILS } } });
  const travelers = [...existing, ...newTravelers];

  const trips = buildTrips(new Date(), travelers.length);
  await prisma.trip.createMany({
    data: trips.map(({ travelerIndex, ...t }) => ({ ...t, travelerId: travelers[travelerIndex].id })),
  });

  const parcels = buildParcels(trips, senders.length);
  await prisma.parcel.createMany({
    data: parcels.map(({ senderIndex, ...p }) => ({
      ...p,
      senderId: senders[senderIndex].id,
      parcelCount: 1,
      prohibitedItemsAccepted: true,
      status: "SEARCHING" as const,
    })),
  });

  return NextResponse.json({
    ok: true,
    travelers: travelers.length,
    senders: senders.length,
    trips: trips.length,
    parcels: parcels.length,
    note: "Supprimez maintenant cette route et redéployez.",
  });
}

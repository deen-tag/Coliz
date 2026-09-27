import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { countCompatibleParcels } from "@/server/matching/engine";

const tripSchema = z
  .object({
    originLabel: z.string().min(1),
    originLat: z.number(),
    originLng: z.number(),
    destinationLabel: z.string().min(1),
    destinationLat: z.number(),
    destinationLng: z.number(),
    departureAt: z.coerce.date(),
    arrivalAt: z.coerce.date().optional(),
    mode: z.enum(["CAR", "TRAIN", "BUS", "PLANE", "MOTORCYCLE", "BICYCLE", "VAN", "FERRY", "OTHER"]),
    preexistingJourneyConfirmed: z.boolean().default(false),
    capacityWeightKg: z.number().positive(),
    capacityLengthCm: z.number().positive(),
    capacityWidthCm: z.number().positive(),
    capacityHeightCm: z.number().positive(),
    capacityParcels: z.number().int().min(1).default(1),
    pickupPointLabel: z.string().optional(),
    dropoffPointLabel: z.string().optional(),
    contributionAmount: z.number().nonnegative(),
  })
  .refine((data) => data.mode !== "CAR" || data.preexistingJourneyConfirmed, {
    message: "Pour le mode voiture, vous devez confirmer que le trajet est prévu indépendamment du colis.",
    path: ["preexistingJourneyConfirmed"],
  });

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = tripSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Le mode doit être activé côté back-office (section 10 du cahier des charges).
  const modeRule = await prisma.transportModeRule.findUnique({ where: { mode: data.mode } });
  if (modeRule && !modeRule.enabled) {
    return NextResponse.json({ error: "Ce mode de transport n'est pas disponible actuellement." }, { status: 422 });
  }

  const trip = await prisma.trip.create({
    data: {
      travelerId: user.id,
      ...data,
      remainingParcels: data.capacityParcels,
      status: "PUBLISHED",
    },
  });

  return NextResponse.json(trip, { status: 201 });
}

export async function GET(req: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const trips = await prisma.trip.findMany({
    where: { travelerId: user.id, ...(status ? { status: status as any } : {}) },
    orderBy: { departureAt: "asc" },
  });

  // "N opportunités compatibles" par trajet (brief UI/UX §22) — calculé à la
  // volée, sans notification automatique pour l'instant (voir §4 du plan).
  const withOpportunities = await Promise.all(
    trips.map(async (t) => ({
      ...t,
      compatibleParcelsCount: await countCompatibleParcels(t),
    }))
  );

  return NextResponse.json(withOpportunities);
}

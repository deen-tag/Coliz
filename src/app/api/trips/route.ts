import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { countCompatibleParcels, findCompatibleParcels } from "@/server/matching/engine";
import { notifyUser } from "@/server/notifications/service";
import { floorForRoute, loadPricingConfig } from "@/server/pricing-config";
import { computeBookingAmounts } from "@/server/pricing";
import { formatEuro, toCents } from "@/server/pricing-grid";

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

  // Plancher de prix : le prix tout compris du trajet ne peut pas descendre sous le plus petit minimum
  // de la grille. Le minimum exact dépend ensuite du poids du colis (appliqué à chaque réservation).
  const config = await loadPricingConfig();
  const floor = floorForRoute(config, data);
  const total = computeBookingAmounts(data.contributionAmount, config.feeRate).totalAmount;
  if (floor !== null && toCents(total) < toCents(floor)) {
    return NextResponse.json(
      {
        error: `Le prix minimum autorisé est de ${formatEuro(floor)} tout compris (frais de service Coliz inclus). Augmentez le montant que vous souhaitez recevoir.`,
        code: "TOO_LOW",
        minPrice: floor,
      },
      { status: 422 }
    );
  }

  const trip = await prisma.trip.create({
    data: {
      travelerId: user.id,
      ...data,
      // Capacité en kilos : le trajet se remplit au fil des réservations (cf. server/bookings/weight.ts).
      // Pas de limite en nombre de colis : « 1 » signifie simplement « encore de la place ».
      capacityParcels: 1,
      remainingParcels: 1,
      remainingWeightKg: data.capacityWeightKg,
      status: "PUBLISHED",
    },
  });

  // Propose automatiquement ce trajet aux colis déjà ouverts compatibles
  // (symétrique de la notification à la création d'un colis, brief §13).
  try {
    const compatibleParcels = await findCompatibleParcels(trip);
    for (const parcel of compatibleParcels.slice(0, 10)) {
      await notifyUser(
        parcel.senderId,
        "new_match",
        `Un nouveau trajet correspond à votre colis ${parcel.originLabel} → ${parcel.destinationLabel}.`
      );
    }
  } catch {
    // best-effort : la publication du trajet ne doit pas dépendre des notifications
  }

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

  // "N opportunités compatibles" par trajet (brief UI/UX §22) — calculé à la volée.
  const withOpportunities = await Promise.all(
    trips.map(async (t) => ({
      ...t,
      compatibleParcelsCount: await countCompatibleParcels(t),
      pendingRequests: await prisma.booking.count({ where: { tripId: t.id, status: "REQUESTED" } }),
    }))
  );

  return NextResponse.json(withOpportunities);
}

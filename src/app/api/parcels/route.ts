import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";

const parcelSchema = z.object({
  originLabel: z.string().min(1),
  originLat: z.number(),
  originLng: z.number(),
  destinationLabel: z.string().min(1),
  destinationLat: z.number(),
  destinationLng: z.number(),
  desiredDate: z.coerce.date(),
  dateFlexibleDays: z.number().int().min(0).default(0),
  weightKg: z.number().positive(),
  lengthCm: z.number().positive(),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  parcelCount: z.number().int().min(1).default(1),
  declaredValue: z.number().nonnegative(),
  photoUrl: z.string().url().optional(),
  prohibitedItemsAccepted: z.literal(true, {
    errorMap: () => ({ message: "Vous devez confirmer avoir lu la liste des objets interdits." }),
  }),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = parcelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Limites commerciales configurables en admin — on retombe sur des valeurs par défaut
  // si aucune configuration n'a encore été créée.
  const rules = await prisma.parcelRuleSettings.findUnique({ where: { id: "singleton" } });
  if (rules) {
    if (data.weightKg > rules.maxWeightKg) {
      return NextResponse.json({ error: `Poids maximum autorisé : ${rules.maxWeightKg} kg` }, { status: 422 });
    }
    if (Number(data.declaredValue) > Number(rules.maxDeclaredValue)) {
      return NextResponse.json(
        { error: `Valeur déclarée maximale autorisée : ${rules.maxDeclaredValue} €` },
        { status: 422 }
      );
    }
  }

  const parcel = await prisma.parcel.create({
    data: {
      senderId: user.id,
      ...data,
      status: "SEARCHING",
    },
  });

  return NextResponse.json(parcel, { status: 201 });
}

export async function GET(req: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const parcels = await prisma.parcel.findMany({
    where: { senderId: user.id, ...(status ? { status: status as any } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(parcels);
}

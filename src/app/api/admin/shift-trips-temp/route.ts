// ROUTE TEMPORAIRE — à supprimer juste après usage.
// Repousse TOUS les trajets à venir (publiés, partiellement ou totalement réservés), quel que soit leur
// voyageur et même s'ils ont une réservation, jusqu'à ~3 mois (92 jours) : décalage de 1 mois, 2 mois…
// jusqu'à dépasser ce seuil, ce qui garde leur répartition dans le temps. L'heure d'arrivée suit.
// Les trajets en cours, terminés, annulés ou archivés ne sont pas touchés.
// Ajouter &dry=1 pour voir ce qui serait fait sans rien modifier.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SECRET = "coliz-demo-v2-k4p8x";
const DAY_MS = 24 * 3600 * 1000;
const MIN_AHEAD_DAYS = 92;

function shiftedForward(departureAt: Date, min: number) {
  let k = 1;
  let next = new Date(departureAt);
  next.setUTCMonth(next.getUTCMonth() + k);
  while (next.getTime() < min && k < 60) {
    k++;
    next = new Date(departureAt);
    next.setUTCMonth(next.getUTCMonth() + k);
  }
  return { next, months: k };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("key") !== SECRET) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const dry = url.searchParams.get("dry") === "1";
  const now = new Date();
  const min = now.getTime() + MIN_AHEAD_DAYS * DAY_MS;

  const trips = await prisma.trip.findMany({
    where: {
      departureAt: { lt: new Date(min) },
      status: { in: ["PUBLISHED", "PARTIALLY_BOOKED", "FULLY_BOOKED"] },
    },
    select: { id: true, departureAt: true, arrivalAt: true, _count: { select: { bookings: true } } },
  });

  const shifts = trips.map((t) => {
    const { next, months } = shiftedForward(t.departureAt, min);
    const delta = next.getTime() - t.departureAt.getTime();
    return {
      id: t.id,
      months,
      withBookings: t._count.bookings > 0,
      departureAt: next,
      arrivalAt: t.arrivalAt ? new Date(t.arrivalAt.getTime() + delta) : null,
    };
  });

  if (!dry) {
    for (let i = 0; i < shifts.length; i += 20) {
      await Promise.all(
        shifts.slice(i, i + 20).map((s) =>
          prisma.trip.update({ where: { id: s.id }, data: { departureAt: s.departureAt, arrivalAt: s.arrivalAt } })
        )
      );
    }
  }

  return NextResponse.json({
    ok: true,
    dry,
    shifted: shifts.length,
    ofWhichWithBookings: shifts.filter((s) => s.withBookings).length,
    byMonths: shifts.reduce<Record<string, number>>((m, s) => ({ ...m, [s.months]: (m[s.months] ?? 0) + 1 }), {}),
  });
}

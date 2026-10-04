// ROUTE TEMPORAIRE — à supprimer juste après usage (même principe que seed-demo-bulk-temp).
// 1) Repousse tous les trajets de démo qui partent dans moins de ~3 mois (92 jours) : on les décale de
//    1 mois, 2 mois… jusqu'à dépasser ce seuil, ce qui garde leur répartition dans le temps.
// 2) Ajoute 30 trajets vers des destinations variées (buildExtraTrips), à partir de ~3 mois, sans doublon.
// Ne touche JAMAIS aux vrais comptes (seuls les comptes @demo.coliz sont concernés), ni aux trajets
// qui ont déjà une réservation. Les colis n'ont plus de date : rien à reporter de ce côté.
// Ajouter &dry=1 pour voir ce qui serait fait sans rien modifier.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildExtraTrips, demoUsers, EXISTING_TRAVELER_EMAILS } from "@/server/demo/bulk-data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SECRET = "coliz-demo-v2-k4p8x";
const DAY_MS = 24 * 3600 * 1000;
// La démo « commence » dans ~3 mois : aucun trajet de démo ne part avant.
const MIN_AHEAD_DAYS = 92;

// Décale d'autant de mois qu'il faut pour que le départ soit au-delà du seuil (~3 mois).
function shiftedForward(departureAt: Date, now: Date) {
  const min = now.getTime() + MIN_AHEAD_DAYS * DAY_MS;
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

  // 1) Trajets de démo qui partent trop tôt (passés ou dans moins de ~3 mois), sans réservation : on les repousse.
  const past = await prisma.trip.findMany({
    where: {
      departureAt: { lt: new Date(now.getTime() + MIN_AHEAD_DAYS * DAY_MS) },
      status: "PUBLISHED",
      bookings: { none: {} },
      traveler: { email: { endsWith: "@demo.coliz" } },
    },
    select: { id: true, departureAt: true, arrivalAt: true },
  });
  const shifts = past.map((t) => {
    const { next, months } = shiftedForward(t.departureAt, now);
    const delta = next.getTime() - t.departureAt.getTime();
    return { id: t.id, departureAt: next, arrivalAt: t.arrivalAt ? new Date(t.arrivalAt.getTime() + delta) : null, months };
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

  // 2) Trajets supplémentaires, répartis entre les voyageurs de démo déjà créés (même ordre que le seed).
  const emails = [...demoUsers().travelers.map((t) => t.email), ...EXISTING_TRAVELER_EMAILS];
  const found = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
  const travelerIds = emails.map((e) => found.find((u) => u.email === e)?.id).filter((x): x is string => Boolean(x));
  if (travelerIds.length === 0) {
    return NextResponse.json({ error: "Aucun voyageur de démo trouvé : lance d'abord seed-demo-bulk-temp." }, { status: 409 });
  }

  const extras = buildExtraTrips(now, travelerIds.length, MIN_AHEAD_DAYS);
  const upcoming = await prisma.trip.findMany({
    where: { departureAt: { gte: now }, traveler: { email: { endsWith: "@demo.coliz" } } },
    select: { originLabel: true, destinationLabel: true },
  });
  const already = new Set(upcoming.map((t) => `${t.originLabel}|${t.destinationLabel}`));
  const toCreate = extras.filter((t) => !already.has(`${t.originLabel}|${t.destinationLabel}`));

  let created = 0;
  if (!dry && toCreate.length) {
    const res = await prisma.trip.createMany({
      data: toCreate.map(({ travelerIndex, ...t }) => ({ ...t, travelerId: travelerIds[travelerIndex] })),
    });
    created = res.count;
  }

  return NextResponse.json({
    ok: true,
    dry,
    shifted: { trips: shifts.length, byMonths: shifts.reduce<Record<string, number>>((m, s) => ({ ...m, [s.months]: (m[s.months] ?? 0) + 1 }), {}) },
    added: dry ? { wouldCreate: toCreate.length, alreadyThere: extras.length - toCreate.length } : { created, alreadyThere: extras.length - toCreate.length },
  });
}

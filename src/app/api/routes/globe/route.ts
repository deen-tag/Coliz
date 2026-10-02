import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Pas de lecture de la base au build : la route est calculée à la demande,
// puis gardée en cache côté CDN quelques minutes (pas une requête par visite).
export const dynamic = "force-dynamic";

type Point = { label: string; lat: number; lng: number };

const shortLabel = (label: string) => label.split(",")[0].trim();
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

// Routes du globe d'accueil : des paires de villes (nom + coordonnées) pour les trajets
// encore réservables, dans le SENS réel du trajet (les cartes « au départ de… » en ont besoin),
// avec le moyen de transport le plus fréquent et le nombre de trajets (qui sert seulement à
// ordonner les routes et à l'épaisseur des arcs : il n'est jamais affiché). Aucune donnée de
// voyageur ni de date.
export async function GET() {
  try {
    const rows = await prisma.trip.groupBy({
      by: ["originLabel", "originLat", "originLng", "destinationLabel", "destinationLat", "destinationLng", "mode"],
      where: {
        status: { in: ["PUBLISHED", "PARTIALLY_BOOKED"] },
        remainingParcels: { gt: 0 },
        departureAt: { gte: new Date() },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 400,
    });

    // Une route par sens et par paire de villes ; deux libellés très proches
    // (« Paris » / « Paris, France ») comptent pour une seule ville.
    const merged = new Map<string, { from: Point; to: Point; count: number; modes: Map<string, number> }>();
    for (const r of rows) {
      const key = [round(r.originLat, 1), round(r.originLng, 1), round(r.destinationLat, 1), round(r.destinationLng, 1)].join("|");
      let found = merged.get(key);
      if (!found) {
        found = {
          from: { label: shortLabel(r.originLabel), lat: round(r.originLat, 2), lng: round(r.originLng, 2) },
          to: { label: shortLabel(r.destinationLabel), lat: round(r.destinationLat, 2), lng: round(r.destinationLng, 2) },
          count: 0,
          modes: new Map(),
        };
        merged.set(key, found);
      }
      found.count += r._count.id;
      found.modes.set(r.mode, (found.modes.get(r.mode) ?? 0) + r._count.id);
    }

    const routes = Array.from(merged.values())
      .map(({ modes, ...m }) => {
        let mode = "OTHER";
        let best = 0;
        modes.forEach((n, k) => {
          if (n > best) {
            best = n;
            mode = k;
          }
        });
        return { ...m, mode };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 200);

    return NextResponse.json(
      { routes },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    // Si la lecture échoue, le globe n'a rien à montrer : la section se masque.
    return NextResponse.json({ routes: [] });
  }
}

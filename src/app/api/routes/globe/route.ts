import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Pas de lecture de la base au build : la route est calculée à la demande,
// puis gardée en cache côté CDN quelques minutes (pas une requête par visite).
export const dynamic = "force-dynamic";

type Point = { label: string; lat: number; lng: number };

const shortLabel = (label: string) => label.split(",")[0].trim();
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

// Routes du globe d'accueil : des paires de villes (nom + coordonnées) pour les trajets
// encore réservables, avec le nombre de trajets par route (sert seulement à choisir les
// routes principales et l'épaisseur des arcs : il n'est jamais affiché). Aucune donnée de
// voyageur ni de date.
export async function GET() {
  try {
    const rows = await prisma.trip.groupBy({
      by: ["originLabel", "originLat", "originLng", "destinationLabel", "destinationLat", "destinationLng"],
      where: {
        status: { in: ["PUBLISHED", "PARTIALLY_BOOKED"] },
        remainingParcels: { gt: 0 },
        departureAt: { gte: new Date() },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 200,
    });

    // Une seule route par paire de villes : Paris → Madrid et Madrid → Paris donnent un seul
    // arc, et deux libellés très proches (« Paris » / « Paris, France ») aussi.
    const merged = new Map<string, { from: Point; to: Point; count: number }>();
    for (const r of rows) {
      const a = `${round(r.originLat, 1)}|${round(r.originLng, 1)}`;
      const b = `${round(r.destinationLat, 1)}|${round(r.destinationLng, 1)}`;
      const key = [a, b].sort().join(">");
      const found = merged.get(key);
      if (found) {
        found.count += r._count.id;
        continue;
      }
      merged.set(key, {
        from: { label: shortLabel(r.originLabel), lat: round(r.originLat, 2), lng: round(r.originLng, 2) },
        to: { label: shortLabel(r.destinationLabel), lat: round(r.destinationLat, 2), lng: round(r.destinationLng, 2) },
        count: r._count.id,
      });
    }

    const routes = Array.from(merged.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 120);

    return NextResponse.json(
      { routes },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    // Le globe reste affiché avec ses routes de fond si la lecture échoue.
    return NextResponse.json({ routes: [] });
  }
}

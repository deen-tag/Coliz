import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Pas de lecture de la base au build : la route est calculée à la demande,
// puis gardée en cache côté CDN quelques minutes (pas une requête par visite).
export const dynamic = "force-dynamic";

type Point = { label: string; lat: number; lng: number };

const shortLabel = (label: string) => label.split(",")[0].trim();
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

// Routes du globe d'accueil : uniquement des paires de villes (nom + coordonnées)
// pour les trajets encore réservables. Aucune donnée de voyageur ni de date.
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
      take: 120,
    });

    // Deux libellés très proches (« Paris » / « Paris, France ») = une seule route.
    const seen = new Map<string, { from: Point; to: Point }>();
    for (const r of rows) {
      const key = [round(r.originLat, 1), round(r.originLng, 1), round(r.destinationLat, 1), round(r.destinationLng, 1)].join("|");
      if (seen.has(key)) continue;
      seen.set(key, {
        from: { label: shortLabel(r.originLabel), lat: round(r.originLat, 2), lng: round(r.originLng, 2) },
        to: { label: shortLabel(r.destinationLabel), lat: round(r.destinationLat, 2), lng: round(r.destinationLng, 2) },
      });
    }

    return NextResponse.json(
      { routes: Array.from(seen.values()).slice(0, 80) },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    // Le globe reste affiché avec ses routes de fond si la lecture échoue.
    return NextResponse.json({ routes: [] });
  }
}

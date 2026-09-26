"use client";

import useSWR from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, VerifiedBadge } from "@/components/ui";
import { BottomNav } from "@/components/bottom-nav";
import { StarIcon } from "@/components/icons";
import { ResultsMap } from "@/components/results-map";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function RecherchePage() {
  const params = useSearchParams();
  const router = useRouter();
  const parcelId = params.get("parcelId");
  const from = params.get("from");
  const to = params.get("to");
  const date = params.get("date");

  const endpoint = parcelId
    ? `/api/trips/search?parcelId=${parcelId}`
    : `/api/trips/search-public?${new URLSearchParams({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(date ? { date } : {}),
      })}`;

  const { data: results } = useSWR(endpoint, fetcher);

  async function book(tripId: string) {
    if (!parcelId) {
      router.push(`/colis/nouveau?tripId=${tripId}`);
      return;
    }
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parcelId, tripId }),
    });
    if (res.ok) {
      const booking = await res.json();
      router.push(`/reservations/${booking.id}`);
    }
  }

  const routeLabel = from && to ? `${from} → ${to}` : null;

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 pb-24 max-w-md mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-1">{routeLabel ?? "Voyageurs disponibles"}</h1>
      <p className="text-sm text-ink/60 mb-6">
        {results ? `${results.length} trajet${results.length > 1 ? "s" : ""} disponible${results.length > 1 ? "s" : ""}` : "Recherche en cours..."}
      </p>

      {results?.length === 0 && (
        <p className="text-sm text-ink/40 text-center py-10">
          Aucun trajet compatible pour l'instant. Publiez votre colis pour être notifié dès qu'un voyageur correspondra.
        </p>
      )}

      {results?.length > 0 && (
        <ResultsMap
          points={results.flatMap((r: any) => [
            { lat: r.originLat, lng: r.originLng },
            { lat: r.destinationLat, lng: r.destinationLng },
          ])}
        />
      )}

      <div className="space-y-3">
        {results?.map((r: any) => (
          <Card key={r.tripId}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-primary font-medium text-sm">
                  {r.traveler.firstName?.[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{r.traveler.firstName}</p>
                  <p className="text-xs text-ink/50 flex items-center gap-1">
                    <StarIcon size={13} className="text-primary" /> {r.traveler.ratingAverage.toFixed(1)} ({r.traveler.ratingCount})
                  </p>
                </div>
              </div>
              <VerifiedBadge identity={r.traveler.identityVerified} email={true} />
            </div>

            {!routeLabel && (
              <p className="text-sm text-ink/70 mb-1">{r.originLabel} → {r.destinationLabel}</p>
            )}
            <p className="text-xs text-ink/50 mb-3">
              {new Date(r.departureAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              {" · "}{r.remainingParcels} place(s) restante(s)
            </p>

            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-ink">{Number(r.contributionAmount).toFixed(2)} €</span>
              <button onClick={() => book(r.tripId)} className="rounded-control bg-primary text-white text-sm font-medium px-5 py-2.5">
                Réserver
              </button>
            </div>
          </Card>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}

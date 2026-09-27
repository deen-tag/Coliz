"use client";

import { Suspense, useState } from "react";
import useSWR from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, VerifiedBadge, TransportModeBadge, SectionHeader, EmptyState, PrimaryButton } from "@/components/ui";
import { ResultsMap } from "@/components/results-map";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const DATE_FMT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

export default function RecherchePage() {
  return (
    <Suspense fallback={null}>
      <RechercheContent />
    </Suspense>
  );
}

function RechercheContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [showMap, setShowMap] = useState(false);

  const parcelId = params.get("parcelId");
  const from = params.get("from");
  const to = params.get("to");
  const date = params.get("date");
  const flex = params.get("flex") ?? "3";

  const endpoint = parcelId
    ? `/api/trips/search?parcelId=${parcelId}`
    : `/api/trips/search-public?${new URLSearchParams({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(date ? { date, flex } : {}),
      })}`;

  const { data: results, isLoading } = useSWR(endpoint, fetcher);

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
  const periodLabel = date
    ? Number(flex) > 0
      ? `Départ entre le ${addDays(date, -Number(flex))} et le ${addDays(date, Number(flex))}`
      : `Départ le ${addDays(date, 0)}`
    : null;

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      <SectionHeader
        title={routeLabel ?? "Voyageurs disponibles"}
        subtitle={
          periodLabel ??
          (isLoading
            ? "Recherche en cours..."
            : `Plusieurs possibilités pour votre colis${results ? ` · ${results.length} résultat${results.length > 1 ? "s" : ""}` : ""}`)
        }
      />

      {results?.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowMap((v) => !v)}
            className="text-sm font-medium text-primary"
          >
            {showMap ? "Masquer la carte" : "Voir sur la carte"}
          </button>
          {showMap && (
            <div className="mt-3">
              <ResultsMap
                points={results.flatMap((r: any) => [
                  { lat: r.originLat, lng: r.originLng },
                  { lat: r.destinationLat, lng: r.destinationLng },
                ])}
              />
            </div>
          )}
        </div>
      )}

      {results?.length === 0 && (
        <EmptyState
          title="Aucun trajet trouvé pour le moment."
          description="Publiez votre colis pour être notifié dès qu'un voyageur correspond à votre trajet — Coliz vous propose automatiquement les nouvelles opportunités."
          action={
            <PrimaryButton className="w-auto px-6" onClick={() => router.push("/colis/nouveau")}>
              Publier mon colis
            </PrimaryButton>
          }
        />
      )}

      <div className="space-y-3">
        {results?.map((r: any) => (
          <Card key={r.tripId}>
            {/* Hiérarchie : trajet → prix → timing → transport → personne (DA §10) */}
            {!routeLabel && (
              <p className="text-sm font-medium text-ink mb-2">
                {r.originLabel} → {r.destinationLabel}
              </p>
            )}

            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-2xl font-semibold text-ink">{Number(r.contributionAmount).toFixed(2)} €</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {new Date(r.departureAt).toLocaleDateString("fr-FR", DATE_FMT)}
                  {r.arrivalAt && ` · arrivée estimée ${new Date(r.arrivalAt).toLocaleDateString("fr-FR", { ...DATE_FMT, hour: "2-digit", minute: "2-digit" })}`}
                </p>
              </div>
              <TransportModeBadge mode={r.mode} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary font-medium text-xs shrink-0">
                  {r.traveler.firstName?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{r.traveler.firstName}</p>
                  <p className="text-xs text-ink-muted">
                    {r.remainingParcels} place{r.remainingParcels > 1 ? "s" : ""} restante{r.remainingParcels > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <VerifiedBadge identity={r.traveler.identityVerified} email={true} />
            </div>

            <button
              onClick={() => book(r.tripId)}
              className="w-full mt-4 rounded-control bg-primary text-white text-sm font-medium py-2.5"
            >
              {parcelId ? "Réserver" : "Voir le trajet"}
            </button>
          </Card>
        ))}
      </div>
    </main>
  );
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("fr-FR", DATE_FMT);
}

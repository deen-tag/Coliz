"use client";

import { Suspense, useState } from "react";
import useSWR from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, VerifiedBadge, TransportModeBadge, SectionHeader, EmptyState, PrimaryButton } from "@/components/ui";
import { ResultsMap } from "@/components/results-map";
import { DateField } from "@/components/date-field";

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

  // La réservation se termine sur la page Détail trajet, pas directement
  // depuis la liste (brief §9 : voir le trajet avant de s'engager).
  function viewTrip(tripId: string) {
    router.push(parcelId ? `/trajets/${tripId}?parcelId=${parcelId}` : `/trajets/${tripId}`);
  }

  const routeLabel = from && to ? `${from} → ${to}` : from ? `Depuis ${from}` : to ? `Vers ${to}` : null;
  const periodLabel = date
    ? Number(flex) > 0
      ? `Départ entre le ${addDays(date, -Number(flex))} et le ${addDays(date, Number(flex))}`
      : `Départ le ${addDays(date, 0)}`
    : null;

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      {!parcelId && <SearchForm from={from ?? ""} to={to ?? ""} date={date ?? ""} flex={flex} />}

      <SectionHeader
        title={routeLabel ?? "Trajets disponibles"}
        subtitle={
          isLoading
            ? "Recherche en cours..."
            : `${periodLabel ? periodLabel + " · " : ""}${
                results ? `${results.length} résultat${results.length > 1 ? "s" : ""}` : ""
              }`
        }
      />

      {results?.length > 0 && (
        <div className="mb-4">
          <button onClick={() => setShowMap((v) => !v)} className="text-sm font-medium text-primary">
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
                <p className="text-2xl font-semibold text-ink">
                  {Number(r.totalAmount ?? r.contributionAmount).toFixed(2)} €
                </p>
                <p className="text-xs text-ink-muted mt-0.5">Prix tout compris</p>
                <p className="text-sm text-ink-muted mt-1">
                  {new Date(r.departureAt).toLocaleDateString("fr-FR", DATE_FMT)}
                  {r.arrivalAt &&
                    ` · arrivée estimée ${new Date(r.arrivalAt).toLocaleDateString("fr-FR", {
                      ...DATE_FMT,
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`}
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
              onClick={() => viewTrip(r.tripId)}
              className="w-full mt-4 rounded-control bg-primary text-white text-sm font-medium py-2.5"
            >
              Voir le trajet
            </button>
          </Card>
        ))}
      </div>
    </main>
  );
}

// Formulaire de recherche rappelé en haut de page : on peut changer une ville
// ou une date sans repasser par l'accueil.
function SearchForm({ from, to, date, flex }: { from: string; to: string; date: string; flex: string }) {
  const router = useRouter();
  const [f, setF] = useState({ from, to, date, flex });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams();
    if (f.from.trim()) q.set("from", f.from.trim());
    if (f.to.trim()) q.set("to", f.to.trim());
    if (f.date) {
      q.set("date", f.date);
      q.set("flex", f.flex);
    }
    router.push(`/recherche?${q.toString()}`);
  }

  const input =
    "w-full rounded-control border border-line bg-surface px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <Card as="form" onSubmit={submit} className="mb-6 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input className={input} placeholder="Départ" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        <input className={input} placeholder="Destination" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DateField label="Date de départ" value={f.date} onChange={(v) => setF({ ...f, date: v })} placeholder="Toutes les dates" />
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1.5 whitespace-nowrap">Période flexible</span>
          <select className={input} value={f.flex} onChange={(e) => setF({ ...f, flex: e.target.value })}>
            <option value="0">Date exacte</option>
            <option value="3">± 3 jours</option>
            <option value="7">± 7 jours</option>
            <option value="15">± 15 jours</option>
          </select>
        </label>
      </div>
      <PrimaryButton type="submit">Rechercher</PrimaryButton>
    </Card>
  );
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("fr-FR", DATE_FMT);
}

"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, VerifiedBadge, TransportModeBadge, PrimaryButton, SecondaryButton } from "@/components/ui";
import { ResultsMap } from "@/components/results-map";
import { DateField } from "@/components/date-field";
import { IconField, IconSelect } from "@/components/form-field";
import { MapPinIcon, CalendarIcon, ClockIcon, ChevronRightIcon, StarIcon } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { JourneySteps } from "@/components/journey-steps";
import { RouteLine, TrustStrip, formatPrice, formatTripMoment } from "@/components/trip-parts";

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
  const [showMap, setShowMap] = useState(false);

  const parcelId = params.get("parcelId");
  const from = params.get("from");
  const to = params.get("to");
  const date = params.get("date");
  const flex = params.get("flex") ?? "3";

  // Sans recherche préalable, le formulaire est ouvert ; sinon il se replie
  // en un résumé modifiable pour laisser la place aux résultats.
  const hasSearch = Boolean(from || to || date);
  const [editing, setEditing] = useState(!hasSearch);

  const endpoint = parcelId
    ? `/api/trips/search?parcelId=${parcelId}`
    : `/api/trips/search-public?${new URLSearchParams({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(date ? { date, flex } : {}),
      })}`;

  const { data, isLoading } = useSWR(endpoint, fetcher);

  // Recherche libre : l'API renvoie { trips, total } par paquets de 15, le bouton "Voir plus" ajoute la suite.
  // Recherche pour un colis : l'API renvoie directement la liste complète (pas de pagination).
  const [more, setMore] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    setMore([]);
  }, [endpoint]);

  const firstPage: any[] | undefined = Array.isArray(data) ? data : Array.isArray(data?.trips) ? data.trips : undefined;
  const total: number = Array.isArray(data) ? data.length : typeof data?.total === "number" ? data.total : firstPage?.length ?? 0;
  const results: any[] | undefined = firstPage
    ? [...firstPage, ...more.filter((m) => !firstPage.some((f) => f.tripId === m.tripId))]
    : undefined;
  const hasMore = !parcelId && Boolean(results) && (results?.length ?? 0) < total;

  async function loadMore() {
    if (!results || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`${endpoint}&offset=${results.length}`);
      const next = await res.json();
      if (Array.isArray(next?.trips)) setMore((m) => [...m, ...next.trips]);
    } finally {
      setLoadingMore(false);
    }
  }

  const routeLabel = from && to ? `${from} → ${to}` : from ? `Depuis ${from}` : to ? `Vers ${to}` : "Tous les trajets";
  const periodLabel = date
    ? Number(flex) > 0
      ? `Départ entre le ${addDays(date, -Number(flex))} et le ${addDays(date, Number(flex))}`
      : `Départ le ${addDays(date, 0)}`
    : "Toutes les dates";

  const count = parcelId ? (results?.length ?? 0) : total;
  const title = isLoading
    ? "Recherche des trajets…"
    : parcelId
      ? `${count} trajet${count > 1 ? "s" : ""} pour votre colis`
      : count === 0
        ? "Aucun trajet pour le moment"
        : `${count} trajet${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""}`;

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      <JourneySteps current={hasSearch || parcelId ? 2 : 1} />

      {!parcelId &&
        (editing ? (
          <SearchForm from={from ?? ""} to={to ?? ""} date={date ?? ""} flex={flex} />
        ) : (
          <Card className="mb-6 !p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-control bg-primary-light text-primary flex items-center justify-center shrink-0">
              <MapPinIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink truncate">{routeLabel}</p>
              <p className="text-sm text-ink-muted truncate">{periodLabel}</p>
            </div>
            <button onClick={() => setEditing(true)} className="text-sm font-medium text-primary shrink-0 px-2 py-1">
              Modifier
            </button>
          </Card>
        ))}

      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-ink leading-tight">{title}</h1>
          {parcelId && <p className="text-sm text-ink-muted mt-1">Compatibles avec le poids et les dimensions de votre colis.</p>}
        </div>
        {count > 0 && (
          <button onClick={() => setShowMap((v) => !v)} className="text-sm font-medium text-primary shrink-0">
            {showMap ? "Masquer la carte" : "Voir sur la carte"}
          </button>
        )}
      </div>

      {showMap && results && results.length > 0 && (
        <div className="mb-4">
          <ResultsMap
            points={results.flatMap((r: any) => [
              { lat: r.originLat, lng: r.originLng },
              { lat: r.destinationLat, lng: r.destinationLng },
            ])}
          />
        </div>
      )}

      {results?.length === 0 && (
        <Card className="text-center">
          <p className="font-medium text-ink mb-1.5">Aucun trajet ne correspond pour le moment.</p>
          <p className="text-sm text-ink-muted mb-5">
            Essayez d&apos;élargir la période ou de changer de ville. Vous pouvez aussi publier votre colis : vous
            êtes prévenu dès qu&apos;un voyageur correspond à votre trajet.
          </p>
          <div className="space-y-2.5">
            {!parcelId && <SecondaryButton onClick={() => setEditing(true)}>Modifier ma recherche</SecondaryButton>}
            <Link href="/colis/nouveau" className="block">
              <PrimaryButton>Publier mon colis</PrimaryButton>
            </Link>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {results?.map((r: any) => (
          <TripResultCard key={r.tripId} r={r} parcelId={parcelId} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-4">
          <SecondaryButton onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Chargement…" : `Voir plus de trajets (${Math.max(0, total - (results?.length ?? 0))} restants)`}
          </SecondaryButton>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="mt-8">
          <TrustStrip />
        </div>
      )}
    </main>
  );
}

// Carte de résultat : qui transporte, sur quel trajet, quand, et à quel prix.
// Toute la carte est cliquable : la réservation se termine sur la page du trajet.
function TripResultCard({ r, parcelId }: { r: any; parcelId: string | null }) {
  const href = parcelId ? `/trajets/${r.tripId}?parcelId=${parcelId}` : `/trajets/${r.tripId}`;
  const places = r.remainingParcels;
  return (
    <Link href={href} className="block">
      <Card className="!p-4 active:bg-surface-alt transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={r.traveler.firstName} src={r.traveler.avatarUrl} size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{r.traveler.firstName}</p>
            {r.traveler.ratingCount > 0 ? (
              <p className="text-xs text-ink-muted flex items-center gap-1">
                <StarIcon size={12} className="text-primary" />
                {Number(r.traveler.ratingAverage).toFixed(1)} ({r.traveler.ratingCount} avis)
              </p>
            ) : (
              <p className="text-xs text-ink-muted">Nouveau voyageur</p>
            )}
          </div>
          <VerifiedBadge identity={r.traveler.identityVerified} email={true} />
        </div>

        <RouteLine from={r.originLabel} to={r.destinationLabel} className="text-[17px] mb-1.5" />
        <p className="text-sm text-ink-muted">{formatTripMoment(r.departureAt)}</p>

        <div className="flex items-end justify-between gap-3 mt-4 pt-4 border-t border-line">
          <div className="space-y-1.5">
            <TransportModeBadge mode={r.mode} />
            <p className="text-xs text-ink-muted">
              {places} place{places > 1 ? "s" : ""} restante{places > 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-ink leading-none">
              {formatPrice(r.totalAmount ?? r.contributionAmount)}
            </p>
            <p className="text-xs text-ink-muted mt-1 flex items-center justify-end gap-0.5">
              Tout compris
              <ChevronRightIcon size={14} className="text-primary" />
            </p>
          </div>
        </div>
      </Card>
    </Link>
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

  return (
    <Card as="form" onSubmit={submit} className="mb-6 space-y-3">
      <div>
        <h1 className="text-lg font-extrabold tracking-tight text-ink">Où voulez-vous envoyer votre colis ?</h1>
        <p className="text-sm text-ink-muted mt-0.5">Coliz trouve les voyageurs qui font déjà ce trajet.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <IconField icon={<MapPinIcon size={18} />} placeholder="Départ" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        <IconField icon={<MapPinIcon size={18} />} placeholder="Destination" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DateField label="Date de départ" value={f.date} onChange={(v) => setF({ ...f, date: v })} placeholder="Toutes les dates" icon={<CalendarIcon size={18} />} />
        <IconSelect label="Période flexible" icon={<ClockIcon size={18} />} value={f.flex} onChange={(e) => setF({ ...f, flex: e.target.value })}>
          <option value="0">Date exacte</option>
          <option value="3">± 3 jours</option>
          <option value="7">± 7 jours</option>
          <option value="15">± 15 jours</option>
        </IconSelect>
      </div>
      <PrimaryButton type="submit">Voir les trajets disponibles</PrimaryButton>
    </Card>
  );
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("fr-FR", DATE_FMT);
}

"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, VerifiedBadge, TransportModeBadge, PrimaryButton, SecondaryButton } from "@/components/ui";
import { ResultsMap } from "@/components/results-map";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { MapPinIcon, ChevronRightIcon, StarIcon } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { JourneySteps } from "@/components/journey-steps";
import { RouteLine, TrustStrip, formatPrice, formatTripMoment } from "@/components/trip-parts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

  // Sans recherche préalable, le formulaire est ouvert ; sinon il se replie
  // en un résumé modifiable pour laisser la place aux résultats.
  const hasSearch = Boolean(from || to);
  const [editing, setEditing] = useState(!hasSearch);

  const endpoint = parcelId
    ? `/api/trips/search?parcelId=${parcelId}`
    : `/api/trips/search-public?${new URLSearchParams({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
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
  const periodLabel = "Du départ le plus proche au plus lointain";

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
          <SearchForm from={from ?? ""} to={to ?? ""} />
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
            Essayez de changer de ville. Vous pouvez aussi publier votre colis : vous
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
        <div className="flex items-center gap-3 mb-4" data-role="traveler">
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
            <p className="text-[28px] font-extrabold tracking-tight text-ink leading-none">
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

// Formulaire de recherche rappelé en haut de page : on peut changer la destination
// sans repasser par l'accueil (départ et arrivée).
function SearchForm({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [f, setF] = useState({ from, to });
  // Nom de la ville seul (« Paris », pas « Paris, Île-de-France, France »).
  const city = (t: string) => t.split(",")[0].trim();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams();
    if (city(f.from)) q.set("from", city(f.from));
    if (city(f.to)) q.set("to", city(f.to));
    router.push(`/recherche?${q.toString()}`);
  }

  return (
    <Card as="form" onSubmit={submit} className="mb-6 space-y-3">
      <div>
        <h1 className="text-lg font-extrabold tracking-tight text-ink">Où voulez-vous envoyer votre colis ?</h1>
        <p className="text-sm text-ink-muted mt-0.5">Coliz trouve les voyageurs qui font déjà ce trajet.</p>
      </div>
      <CityAutocomplete label="Départ" placeholder="Ville de départ" defaultText={from} onText={(t) => setF((p) => ({ ...p, from: t }))} />
      <CityAutocomplete label="Destination" placeholder="Ville d'arrivée" defaultText={to} onText={(t) => setF((p) => ({ ...p, to: t }))} />
      <PrimaryButton type="submit">Voir les trajets disponibles</PrimaryButton>
    </Card>
  );
}

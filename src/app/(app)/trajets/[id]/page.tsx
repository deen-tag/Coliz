"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Card, PrimaryButton, SecondaryButton, VerifiedBadge, TransportModeBadge, StatusBadge, LoadingState } from "@/components/ui";
import { ChevronRightIcon, StarIcon } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { JourneySteps } from "@/components/journey-steps";
import { TrustStrip, formatPrice, formatTripMoment, formatTripTime, formatTripDate, shortCity } from "@/components/trip-parts";
import { authHref } from "@/lib/callback-url";
import { useRoleOverride } from "@/components/role-scope";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TrajetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const parcelId = params.get("parcelId");
  const authPromptRef = useRef<HTMLDivElement>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: trip, isLoading } = useSWR(`/api/trips/${id}`, fetcher);
  const { data: session, status } = useSession();

  // Mon propre trajet : je le regarde en tant que voyageur (cuivre). Sinon je suis expéditeur (pétrole).
  useRoleOverride(trip && !trip.error && trip.traveler && (session?.user as any)?.id === trip.traveler.id ? "traveler" : null);

  // Page à retrouver après connexion / inscription.
  const backHere = `/trajets/${id}${parcelId ? `?parcelId=${parcelId}` : ""}`;

  async function reserve() {
    // Visiteur : l'action est protégée, on explique et on propose un compte à ce moment-là.
    if (status !== "authenticated") {
      setShowAuthPrompt(true);
      setTimeout(() => authPromptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    if (!parcelId) {
      router.push(`/colis/nouveau?tripId=${id}`);
      return;
    }
    setError(null);
    setReserving(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parcelId, tripId: id }),
    });
    if (res.ok) {
      const booking = await res.json();
      router.push(`/reservations/${booking.id}`);
      return;
    }
    setReserving(false);
    setError("La réservation n'a pas pu être envoyée. Réessayez dans un instant.");
  }

  if (isLoading) return <LoadingState />;
  if (!trip || trip.error) {
    return (
      <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto text-center">
        <p className="text-sm text-ink-muted py-10">Ce trajet n&apos;existe plus ou n&apos;est plus disponible.</p>
        <Link href="/recherche">
          <PrimaryButton className="w-auto px-6">Chercher un autre trajet</PrimaryButton>
        </Link>
      </main>
    );
  }

  const isOwner = (session?.user as any)?.id === trip.traveler.id;
  // Un trajet n'accepte plus de demandes une fois parti.
  const departed = new Date(trip.departureAt).getTime() <= Date.now();
  const bookable = !departed && trip.remainingParcels > 0 && ["PUBLISHED", "PARTIALLY_BOOKED"].includes(trip.status);
  const departureTime = formatTripTime(trip.departureAt);
  const places = trip.remainingParcels;

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      {/* Le fil d'étapes est celui de l'expéditeur : inutile sur son propre trajet. */}
      {!isOwner && <JourneySteps current={3} />}

      <div className="mb-5">
        <p className="text-sm text-ink-muted mb-1 capitalize">{formatTripDate(trip.departureAt, "long")}</p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink leading-tight">
            {shortCity(trip.originLabel)} <span className="text-ink-muted font-normal">→</span> {shortCity(trip.destinationLabel)}
          </h1>
          {/* Le statut n'apporte rien à un expéditeur tant que le trajet est réservable. */}
          {(isOwner || (!bookable && !departed)) && <StatusBadge status={trip.status} />}
        </div>
      </div>

      {/* Ce que l'on paie et où l'on va */}
      <Card className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            {isOwner ? (
              <>
                <p className="text-3xl font-semibold text-primary leading-none">{formatPrice(trip.contributionAmount)}</p>
                <p className="text-xs text-ink-muted mt-1.5">
                  Ce que vous recevez · l&apos;expéditeur paie {formatPrice(trip.totalAmount ?? trip.contributionAmount)} frais inclus
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-semibold text-ink leading-none">
                  {formatPrice(trip.totalAmount ?? trip.contributionAmount)}
                </p>
                <p className="text-xs text-ink-muted mt-1.5">Tout compris, frais de service inclus</p>
              </>
            )}
          </div>
          <TransportModeBadge mode={trip.mode} />
        </div>

        <ol className="mt-5 pt-5 border-t border-line">
          <TimelineStop
            first
            caption={`Départ${departureTime ? ` · ${departureTime}` : ""}`}
            place={trip.originLabel}
            detail={trip.pickupPointLabel && trip.pickupPointLabel !== trip.originLabel ? trip.pickupPointLabel : null}
          />
          <TimelineStop
            last
            caption={trip.arrivalAt ? `Arrivée estimée · ${formatTripMoment(trip.arrivalAt)}` : "Arrivée"}
            place={trip.destinationLabel}
            detail={trip.dropoffPointLabel && trip.dropoffPointLabel !== trip.destinationLabel ? trip.dropoffPointLabel : null}
          />
        </ol>

        <dl className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-line text-sm">
          <div>
            <dt className="text-ink-muted">Places restantes</dt>
            <dd className="font-semibold text-ink mt-0.5">{places}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Colis accepté</dt>
            <dd className="font-semibold text-ink mt-0.5">Jusqu&apos;à {trip.capacityWeightKg} kg</dd>
            <dd className="text-xs text-ink-muted">
              {trip.capacityLengthCm}×{trip.capacityWidthCm}×{trip.capacityHeightCm} cm
            </dd>
          </div>
        </dl>
      </Card>

      {/* Qui transporte (inutile sur son propre trajet) */}
      {!isOwner && (
      <Link href={`/voyageurs/${trip.traveler.id}`} className="block mb-4">
        <Card className="flex items-center gap-3.5">
          <Avatar name={trip.traveler.firstName} src={trip.traveler.avatarUrl} size={52} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-muted mb-0.5">Votre voyageur</p>
            <p className="font-semibold text-ink">{trip.traveler.firstName}</p>
            {trip.traveler.ratingCount > 0 ? (
              <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                <StarIcon size={12} className="text-primary" />
                {Number(trip.traveler.ratingAverage).toFixed(1)} ({trip.traveler.ratingCount} avis)
              </p>
            ) : (
              <p className="text-xs text-ink-muted mt-0.5">Nouveau voyageur</p>
            )}
            <div className="mt-2">
              <VerifiedBadge identity={trip.traveler.identityVerified} email={true} />
            </div>
          </div>
          <span className="flex items-center gap-0.5 text-sm font-medium text-primary shrink-0">
            Profil
            <ChevronRightIcon size={16} />
          </span>
        </Card>
      </Link>
      )}

      {/* Ce qui se passe après : l'utilisateur sait où il va avant de s'engager */}
      {bookable && !isOwner && (
        <Card className="mb-6">
          <p className="font-semibold text-ink mb-4">Et ensuite ?</p>
          <ol className="space-y-4">
            {[
              parcelId
                ? "Vous envoyez votre demande au voyageur."
                : "Vous décrivez votre colis, puis vous envoyez votre demande au voyageur.",
              "Une fois la demande acceptée, vous payez : l'argent est bloqué jusqu'à la remise du colis.",
              "Vous suivez l'envoi, et un code confirme la remise.",
            ].map((text, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary-light text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-ink leading-snug pt-0.5">{text}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Action */}
      {isOwner ? (
        <div className="text-center py-3">
          <p className="text-sm text-ink-muted mb-4">
            C&apos;est votre trajet. Les demandes des expéditeurs apparaissent dans Réservations.
          </p>
          <Link href="/reservations">
            <SecondaryButton className="w-auto px-6">Voir mes demandes</SecondaryButton>
          </Link>
        </div>
      ) : bookable ? (
        <div>
          <PrimaryButton onClick={reserve} disabled={status === "loading" || reserving}>
            {reserving ? "Envoi de la demande..." : parcelId ? "Envoyer ma demande au voyageur" : "Envoyer un colis sur ce trajet"}
          </PrimaryButton>
          {error && <p className="text-sm text-error text-center mt-3">{error}</p>}

          {showAuthPrompt && status === "unauthenticated" && (
            <div ref={authPromptRef}>
              <Card className="mt-4 border-primary/30">
                <p className="font-semibold text-ink mb-1">Un compte est nécessaire pour réserver</p>
                <p className="text-sm text-ink-muted mb-4">
                  Créez-le en une minute ou connectez-vous : vous reviendrez directement sur ce trajet.
                </p>
                <div className="space-y-2.5">
                  <Link href={authHref("/inscription", backHere)} className="block">
                    <PrimaryButton>Créer un compte</PrimaryButton>
                  </Link>
                  <Link href={authHref("/connexion", backHere)} className="block">
                    <SecondaryButton>J&apos;ai déjà un compte</SecondaryButton>
                  </Link>
                </div>
              </Card>
            </div>
          )}

          <TrustStrip className="mt-6" />
        </div>
      ) : (
        <div className="text-center py-3">
          <p className="text-sm text-ink-muted mb-4">{departed ? "Ce trajet est déjà parti." : "Ce trajet n'a plus de place disponible."}</p>
          <Link href="/recherche">
            <SecondaryButton className="w-auto px-6">Voir d&apos;autres trajets</SecondaryButton>
          </Link>
        </div>
      )}
    </main>
  );
}

// Un arrêt de l'itinéraire : pastille + ligne verticale, pour lire le trajet de haut en bas.
function TimelineStop({
  caption,
  place,
  detail,
  first,
  last,
}: {
  caption: string;
  place: string;
  detail?: string | null;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <li className="flex gap-3.5">
      <div className="flex flex-col items-center pt-1">
        <span
          className={`w-3 h-3 rounded-full shrink-0 ${first ? "border-2 border-primary bg-surface" : "bg-primary"}`}
          aria-hidden
        />
        {!last && <span className="flex-1 w-0 border-l-2 border-dashed border-line my-1" aria-hidden />}
      </div>
      <div className={last ? "" : "pb-5"}>
        <p className="text-xs text-ink-muted">{caption}</p>
        <p className="font-semibold text-ink">{place}</p>
        {detail && <p className="text-sm text-ink-muted mt-0.5">Point de rendez-vous : {detail}</p>}
      </div>
    </li>
  );
}

"use client";

import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Card, SectionHeader, PrimaryButton, VerifiedBadge, TransportModeBadge, StatusBadge } from "@/components/ui";
import { StarIcon } from "@/components/icons";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TrajetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const parcelId = params.get("parcelId");

  const { data: trip, isLoading } = useSWR(`/api/trips/${id}`, fetcher);
  const { data: session } = useSession();

  async function reserve() {
    if (!parcelId) {
      router.push(`/colis/nouveau?tripId=${id}`);
      return;
    }
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parcelId, tripId: id }),
    });
    if (res.ok) {
      const booking = await res.json();
      router.push(`/reservations/${booking.id}`);
    }
  }

  if (isLoading) return null;
  if (!trip || trip.error) {
    return (
      <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto text-center">
        <p className="text-sm text-ink-muted py-10">Ce trajet n&apos;existe plus ou n&apos;est plus disponible.</p>
      </main>
    );
  }

  const isOwner = (session?.user as any)?.id === trip.traveler.id;
  const bookable = trip.remainingParcels > 0 && ["PUBLISHED", "PARTIALLY_BOOKED"].includes(trip.status);

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      <SectionHeader
        title={`${trip.originLabel} → ${trip.destinationLabel}`}
        subtitle={new Date(trip.departureAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        action={<StatusBadge status={trip.status} />}
      />

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-3xl font-semibold text-ink">
              {Number(trip.totalAmount ?? trip.contributionAmount).toFixed(2)} €
            </p>
            <p className="text-xs text-ink-muted mt-0.5">Prix tout compris, frais de service inclus</p>
          </div>
          <TransportModeBadge mode={trip.mode} />
        </div>

        <dl className="space-y-2 text-sm">
          <Row label="Départ" value={trip.pickupPointLabel ?? trip.originLabel} />
          <Row label="Arrivée" value={trip.dropoffPointLabel ?? trip.destinationLabel} />
          {trip.arrivalAt && (
            <Row
              label="Arrivée estimée"
              value={new Date(trip.arrivalAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            />
          )}
          <Row label="Places restantes" value={`${trip.remainingParcels}`} />
          <Row
            label="Capacité max. par colis"
            value={`${trip.capacityWeightKg} kg · ${trip.capacityLengthCm}×${trip.capacityWidthCm}×${trip.capacityHeightCm} cm`}
          />
        </dl>
      </Card>

      <Link href={`/voyageurs/${trip.traveler.id}`}>
        <Card className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-full bg-primary-light flex items-center justify-center text-primary font-medium shrink-0">
            {trip.traveler.firstName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink">{trip.traveler.firstName}</p>
            {trip.traveler.ratingCount > 0 && (
              <p className="text-xs text-ink-muted flex items-center gap-1">
                <StarIcon size={12} className="text-primary" />
                {trip.traveler.ratingAverage.toFixed(1)} ({trip.traveler.ratingCount} avis)
              </p>
            )}
          </div>
          <VerifiedBadge identity={trip.traveler.identityVerified} email={true} />
        </Card>
      </Link>

      {isOwner ? (
        <p className="text-sm text-ink-muted text-center py-3">C&apos;est votre trajet. Les demandes apparaissent dans Réservations.</p>
      ) : bookable ? (
        <PrimaryButton onClick={reserve}>{parcelId ? "Réserver" : "Envoyer un colis sur ce trajet"}</PrimaryButton>
      ) : (
        <p className="text-sm text-ink-muted text-center py-3">Ce trajet n&apos;a plus de place disponible.</p>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink font-medium">{value}</dd>
    </div>
  );
}

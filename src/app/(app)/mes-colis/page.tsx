"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, SectionHeader, StatusBadge, TransportModeBadge, EmptyState, PrimaryButton } from "@/components/ui";
import { ChevronRightIcon } from "@/components/icons";
import { RouteLine, formatPrice } from "@/components/trip-parts";
import { bookingHref } from "@/lib/booking-status";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Prochaine étape lisible pour l'expéditeur — jamais un simple statut technique (DA §21/§25).
const NEXT_STEP: Record<string, string> = {
  DRAFT: "Finaliser la publication",
  SEARCHING: "Choisir un trajet",
  MATCHED: "Choisir une proposition",
  BOOKED: "En attente de paiement",
  PAID: "En attente de remise au voyageur",
  PICKED_UP: "Colis en transport",
  IN_TRANSIT: "Colis en transport",
  ARRIVED: "En attente de réception",
  DELIVERED: "Livraison terminée",
  CLOSED: "Terminé",
  CANCELLED: "Annulé",
};

export default function MesColisPage() {
  const { data: parcels, isLoading } = useSWR("/api/parcels", fetcher);

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      <SectionHeader
        title="Mes colis"
        subtitle="Suivez vos envois en cours"
        action={
          parcels?.length > 0 ? (
            <Link href="/colis/nouveau">
              <PrimaryButton className="w-auto px-4 py-2.5 text-sm">Envoyer un colis</PrimaryButton>
            </Link>
          ) : undefined
        }
      />

      {isLoading && <p className="text-sm text-ink-muted text-center py-10">Chargement...</p>}

      {parcels?.length === 0 && (
        <EmptyState
          title="Vous n'avez encore publié aucun colis"
          description="Décrivez votre colis et Coliz recherche automatiquement les voyageurs compatibles."
          action={
            <Link href="/colis/nouveau">
              <PrimaryButton className="w-auto px-6">Envoyer un colis</PrimaryButton>
            </Link>
          }
        />
      )}

      <div className="space-y-3">
        {parcels?.map((p: any) => (
          <Link key={p.id} href={parcelHref(p)} className="block">
            <Card className="!p-4 active:bg-surface-alt transition-colors">
              <div className="flex items-start justify-between gap-3 mb-3">
                <RouteLine from={p.originLabel} to={p.destinationLabel} className="flex-1" />
                <StatusBadge status={p.status} />
              </div>
              {p.booking && <p className="text-sm text-ink-muted">Avec {p.booking.travelerFirstName}</p>}
              <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-line">
                <div className="flex items-center gap-2 min-w-0">
                  {p.booking && <TransportModeBadge mode={p.booking.mode} />}
                  {p.booking && <span className="font-semibold text-ink">{formatPrice(p.booking.totalAmount)}</span>}
                </div>
                <span className="flex items-center gap-0.5 text-xs font-medium text-primary">
                  {NEXT_STEP[p.status] ?? p.status}
                  <ChevronRightIcon size={14} />
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}

// Où mène la carte : le suivi une fois le colis payé, la réservation tant
// qu'elle se négocie, la recherche de trajets tant qu'aucun n'est choisi.
function parcelHref(p: any) {
  if (p.booking) return bookingHref(p.booking);
  return `/recherche?parcelId=${p.id}`;
}

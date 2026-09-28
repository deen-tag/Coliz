"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, SectionHeader, StatusBadge, TransportModeBadge, EmptyState, PrimaryButton } from "@/components/ui";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Prochaine étape lisible pour l'expéditeur — jamais un simple statut technique (DA §21/§25).
const NEXT_STEP: Record<string, string> = {
  DRAFT: "Finaliser la publication",
  SEARCHING: "Recherche de trajet en cours",
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
          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-ink">
                {p.originLabel} → {p.destinationLabel}
              </p>
              <StatusBadge status={p.status} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {p.booking && <TransportModeBadge mode={p.booking.mode} />}
                <span className="text-xs text-ink-muted">
                  {new Date(p.desiredDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  {p.booking && ` · avec ${p.booking.travelerFirstName}`}
                </span>
              </div>
              {p.booking && <span className="text-sm font-semibold text-ink">{Number(p.booking.totalAmount).toFixed(2)} €</span>}
            </div>

            <p className="text-xs text-primary font-medium mt-3">
              {NEXT_STEP[p.status] ?? p.status}
            </p>
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
  if (p.booking) {
    const paid = ["CONFIRMED", "PICKED_UP", "IN_TRANSIT", "ARRIVED", "DELIVERED", "COMPLETED"].includes(p.booking.status);
    return paid ? `/suivi/${p.booking.id}` : `/reservations/${p.booking.id}`;
  }
  return `/recherche?parcelId=${p.id}`;
}

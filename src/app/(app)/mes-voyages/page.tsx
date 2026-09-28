"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, SectionHeader, StatusBadge, TransportModeBadge, EmptyState, PrimaryButton } from "@/components/ui";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MesVoyagesPage() {
  const { data: trips, isLoading } = useSWR("/api/trips", fetcher);

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      <SectionHeader
        title="Mes voyages"
        subtitle="Vos trajets publiés et leurs opportunités"
        action={
          trips?.length > 0 ? (
          <Link href="/trajets/nouveau">
            <PrimaryButton className="w-auto px-4 py-2.5 text-sm">Proposer un trajet</PrimaryButton>
            </Link>
          ) : undefined
        }
      />

      {isLoading && <p className="text-sm text-ink-muted text-center py-10">Chargement...</p>}

      {trips?.length === 0 && (
        <EmptyState
          title="Vous n'avez encore publié aucun trajet"
          description="Indiquez votre trajet et votre capacité disponible : Coliz vous propose les colis compatibles."
          action={
            <Link href="/trajets/nouveau">
              <PrimaryButton className="w-auto px-6">Proposer un trajet</PrimaryButton>
            </Link>
          }
        />
      )}

      <div className="space-y-3">
        {trips?.map((t: any) => (
          <Link key={t.id} href={`/trajets/${t.id}`} className="block">
          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-ink">
                {t.originLabel} → {t.destinationLabel}
              </p>
              <StatusBadge status={t.status} />
            </div>

            <div className="flex items-center justify-between mb-3">
              <TransportModeBadge mode={t.mode} />
              <span className="text-xs text-ink-muted">
                {new Date(t.departureAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                {" · "}
                {t.remainingParcels} place{t.remainingParcels > 1 ? "s" : ""} restante{t.remainingParcels > 1 ? "s" : ""}
              </span>
            </div>

            {t.pendingRequests > 0 && (
              <p className="text-xs font-medium text-warning mb-1">
                {t.pendingRequests} demande{t.pendingRequests > 1 ? "s" : ""} en attente de votre réponse
              </p>
            )}
            {["PUBLISHED", "PARTIALLY_BOOKED"].includes(t.status) && (
              <p className={`text-xs font-medium ${t.compatibleParcelsCount > 0 ? "text-teal" : "text-ink-muted"}`}>
                {t.compatibleParcelsCount > 0
                  ? `${t.compatibleParcelsCount} opportunité${t.compatibleParcelsCount > 1 ? "s" : ""} compatible${t.compatibleParcelsCount > 1 ? "s" : ""}`
                  : "Aucune opportunité compatible pour l'instant"}
              </p>
            )}
          </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}

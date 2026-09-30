"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, SectionHeader, StatusBadge, TransportModeBadge, EmptyState, PrimaryButton } from "@/components/ui";
import { ChevronRightIcon } from "@/components/icons";
import { RouteLine, formatPrice, formatTripMoment } from "@/components/trip-parts";

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
        {trips?.map((t: any) => {
          const open = ["PUBLISHED", "PARTIALLY_BOOKED"].includes(t.status);
          return (
            <Link key={t.id} href={`/trajets/${t.id}`} className="block">
              <Card className="!p-4 active:bg-surface-alt transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <RouteLine from={t.originLabel} to={t.destinationLabel} className="flex-1" />
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-sm text-ink-muted">
                  {formatTripMoment(t.departureAt)}
                  {" · "}
                  {t.remainingParcels} place{t.remainingParcels > 1 ? "s" : ""} restante{t.remainingParcels > 1 ? "s" : ""}
                </p>

                <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-line">
                  <div className="flex items-center gap-2 min-w-0">
                    <TransportModeBadge mode={t.mode} />
                    {t.contributionAmount != null && (
                      <span className="font-semibold text-primary">+ {formatPrice(t.contributionAmount)}</span>
                    )}
                  </div>
                  <span className="flex items-center gap-0.5 text-xs font-medium text-right">
                    {t.pendingRequests > 0 ? (
                      <span className="text-warning">
                        {t.pendingRequests} demande{t.pendingRequests > 1 ? "s" : ""} à traiter
                      </span>
                    ) : open ? (
                      <span className={t.compatibleParcelsCount > 0 ? "text-primary" : "text-ink-muted"}>
                        {t.compatibleParcelsCount > 0
                          ? `${t.compatibleParcelsCount} opportunité${t.compatibleParcelsCount > 1 ? "s" : ""} compatible${t.compatibleParcelsCount > 1 ? "s" : ""}`
                          : "Aucune opportunité pour l'instant"}
                      </span>
                    ) : null}
                    <ChevronRightIcon size={14} className="text-ink-muted" />
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

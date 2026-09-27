"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, SectionHeader, StatusBadge, TransportModeBadge, EmptyState, PrimaryButton } from "@/components/ui";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ReservationsPage() {
  const { data: bookings, isLoading } = useSWR("/api/bookings", fetcher);

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      <SectionHeader title="Réservations" subtitle="Vos accords en cours et passés" />

      {isLoading && <p className="text-sm text-ink-muted text-center py-10">Chargement...</p>}

      {bookings?.length === 0 && (
        <EmptyState
          title="Aucune réservation pour le moment"
          description="Dès qu'un envoi ou un trajet aboutit à un accord, il apparaît ici."
          action={
            <Link href="/recherche">
              <PrimaryButton className="w-auto px-6">Voir les possibilités</PrimaryButton>
            </Link>
          }
        />
      )}

      <div className="space-y-3">
        {bookings?.map((b: any) => (
          <Link key={b.id} href={`/reservations/${b.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-ink">
                  {b.originLabel} → {b.destinationLabel}
                </p>
                <StatusBadge status={b.status} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TransportModeBadge mode={b.mode} />
                  <span className="text-xs text-ink-muted">
                    {new Date(b.departureAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    {" · "}
                    {b.role === "sender" ? `avec ${b.counterpart}` : `pour ${b.counterpart}`}
                  </span>
                </div>
                <span className="text-sm font-semibold text-ink">{Number(b.totalAmount).toFixed(2)} €</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import useSWR from "swr";
import { SectionHeader, EmptyState, PrimaryButton } from "@/components/ui";
import { BookingRow } from "@/components/booking-row";
import { bookingStatusInfo, isPastBooking } from "@/lib/booking-status";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ReservationsPage() {
  const { data, isLoading } = useSWR("/api/bookings", fetcher);
  const bookings: any[] | undefined = Array.isArray(data) ? data : undefined;

  const needsAction = (b: any) =>
    bookingStatusInfo(b.status, b.role === "sender" ? "sender" : "traveler", b.counterpart).actionNeeded;

  // Ce qui attend une action passe en premier, l'historique en dernier.
  const groups = [
    { title: "À faire", items: bookings?.filter((b) => needsAction(b)) ?? [] },
    { title: "En cours", items: bookings?.filter((b) => !needsAction(b) && !isPastBooking(b.status)) ?? [] },
    { title: "Terminées", items: bookings?.filter((b) => isPastBooking(b.status)) ?? [] },
  ].filter((g) => g.items.length > 0);

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

      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="text-sm font-medium text-ink-muted mb-3">
              {g.title} ({g.items.length})
            </h2>
            <div className="space-y-3">
              {g.items.map((b) => (
                <BookingRow key={b.id} b={b} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Card, SectionHeader, EmptyState, PrimaryButton } from "@/components/ui";
import { PackageIcon, SuitcaseIcon, CardIcon, WalletIcon } from "@/components/icons";
import { BookingRow } from "@/components/booking-row";
import { isPastBooking } from "@/lib/booking-status";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Chaque raccourci porte la couleur de son rôle : pétrole côté expéditeur, cuivre côté voyageur.
const SHORTCUTS: { href: string; label: string; Icon: typeof PackageIcon; role: "sender" | "traveler" }[] = [
  { href: "/mes-colis", label: "Mes colis", Icon: PackageIcon, role: "sender" },
  { href: "/mes-voyages", label: "Mes voyages", Icon: SuitcaseIcon, role: "traveler" },
  { href: "/reservations", label: "Réservations", Icon: CardIcon, role: "sender" },
  { href: "/portefeuille", label: "Portefeuille", Icon: WalletIcon, role: "traveler" },
];

export default function ActivitePage() {
  const { data, isLoading } = useSWR("/api/bookings", fetcher);
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");

  const bookings: any[] = Array.isArray(data) ? data : [];
  const upcoming = bookings.filter((b) => !isPastBooking(b.status));
  const history = bookings.filter((b) => isPastBooking(b.status));
  const shown = tab === "upcoming" ? upcoming : history;

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      <SectionHeader title="Activité" subtitle="Tout ce qui concerne vos colis et vos trajets" />

      <div className="grid grid-cols-4 gap-2 mb-6">
        {SHORTCUTS.map(({ href, label, Icon, role }) => (
          <Link key={href} href={href} className="block h-full" data-role={role}>
            <Card className="!p-3 h-full flex flex-col items-center gap-2 text-center leading-tight active:bg-surface-alt">
              <span className="w-10 h-10 rounded-control bg-primary-light text-primary flex items-center justify-center">
                <Icon size={20} />
              </span>
              <span className="text-[11px] font-medium text-ink leading-tight">{label}</span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex border-b border-line mb-4" role="tablist">
        {(
          [
            { key: "upcoming", label: "À venir", count: upcoming.length },
            { key: "history", label: "Historique", count: history.length },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-ink-muted"
            }`}
          >
            {t.label}
            {t.count > 0 ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-ink-muted text-center py-10">Chargement...</p>}

      {!isLoading && shown.length === 0 && (
        <EmptyState
          title={tab === "upcoming" ? "Rien en cours pour le moment" : "Aucun historique pour l'instant"}
          description={
            tab === "upcoming"
              ? "Vos envois et vos transports apparaîtront ici dès qu'une réservation est lancée."
              : "Les envois terminés ou annulés seront rangés ici."
          }
          action={
            tab === "upcoming" ? (
              <Link href="/recherche">
                <PrimaryButton className="w-auto px-6">Chercher un trajet</PrimaryButton>
              </Link>
            ) : undefined
          }
        />
      )}

      <div className="space-y-3">
        {shown.map((b) => (
          <BookingRow key={b.id} b={b} />
        ))}
      </div>
    </main>
  );
}

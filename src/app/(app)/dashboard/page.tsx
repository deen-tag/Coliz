"use client";

import useSWR from "swr";
import Link from "next/link";
import { Card, PrimaryButton, StatusBadge } from "@/components/ui";
import { BottomNav } from "@/components/bottom-nav";
import { Logo } from "@/components/logo";
import { BellIcon, SettingsIcon } from "@/components/icons";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const { data } = useSWR("/api/dashboard", fetcher);

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 pb-24 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Logo variant="symbol" size={32} />
        <div className="flex items-center gap-4">
          <Link href="/notifications" className="relative text-ink/70">
            <BellIcon size={22} />
            {data?.unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {data.unreadNotifications}
              </span>
            )}
          </Link>
          <Link href="/parametres" className="text-ink/70">
            <SettingsIcon size={22} />
          </Link>
        </div>
      </div>

      <Link href="/colis/nouveau">
        <PrimaryButton className="mb-6">+ Envoyer un colis</PrimaryButton>
      </Link>

      <Section title="Mes colis en cours">
        {data?.activeParcels?.length ? (
          data.activeParcels.map((p: any) => (
            <Card key={p.id} className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">{p.originLabel} → {p.destinationLabel}</p>
                <p className="text-xs text-ink/50 mt-0.5">{new Date(p.desiredDate).toLocaleDateString("fr-FR")}</p>
              </div>
              <StatusBadge status={p.status} />
            </Card>
          ))
        ) : (
          <EmptyState text="Aucun colis en cours." />
        )}
      </Section>

      <Section title="Mes trajets">
        {data?.activeTrips?.length ? (
          data.activeTrips.map((t: any) => (
            <Card key={t.id} className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">{t.originLabel} → {t.destinationLabel}</p>
                <p className="text-xs text-ink/50 mt-0.5">{new Date(t.departureAt).toLocaleDateString("fr-FR")}</p>
              </div>
              <StatusBadge status={t.status} />
            </Card>
          ))
        ) : (
          <EmptyState text="Aucun trajet publié." />
        )}
        <Link href="/trajets/nouveau" className="text-sm text-primary font-medium block mt-2">
          + Publier un trajet
        </Link>
      </Section>

      <BottomNav />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-ink/60 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-ink/40 py-4 text-center">{text}</p>;
}

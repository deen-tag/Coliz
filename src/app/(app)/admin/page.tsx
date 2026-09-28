"use client";

import useSWR from "swr";
import { Card, SectionHeader } from "@/components/ui";


const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminDashboardPage() {
  const { data } = useSWR("/api/admin", fetcher);

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-3xl mx-auto">
      <SectionHeader title="Back-office Coliz" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Counter label="Incidents ouverts" value={data?.counters?.openIncidents} tone="warning" />
        <Counter label="Utilisateurs actifs" value={data?.counters?.activeUsers} />
        <Counter label="Réservations aujourd'hui" value={data?.counters?.bookingsToday} />
        <Counter label="Volume ce mois-ci" value={data ? `${Number(data.counters?.gmvThisMonth ?? 0).toFixed(0)} €` : "…"} />
      </div>

      <h2 className="text-sm font-medium text-ink-muted mb-3">Incidents à traiter</h2>
      <div className="space-y-3">
        {data?.recentIncidents?.length ? (
          data.recentIncidents.map((inc: any) => (
            <Card key={inc.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-ink">{inc.category}</span>
                <span className="text-xs text-ink-muted">{new Date(inc.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
              <p className="text-sm text-ink-muted mb-1">{inc.description}</p>
              <p className="text-xs text-ink-muted">Signalé par {inc.reporter.firstName} {inc.reporter.lastName}</p>
            </Card>
          ))
        ) : (
          <p className="text-sm text-ink-muted">Aucun incident ouvert.</p>
        )}
      </div>
    </main>
  );
}

function Counter({ label, value, tone }: { label: string; value: any; tone?: "warning" }) {
  return (
    <Card>
      <p className="text-xs text-ink-muted mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${tone === "warning" ? "text-error" : "text-ink"}`}>
        {value ?? "…"}
      </p>
    </Card>
  );
}

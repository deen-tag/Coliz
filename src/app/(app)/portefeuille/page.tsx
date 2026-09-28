"use client";

import useSWR from "swr";
import { Card, PrimaryButton, SectionHeader } from "@/components/ui";


const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PortefeuillePage() {
  const { data: wallet } = useSWR("/api/wallet", fetcher);
  const { data: connectStatus } = useSWR("/api/stripe/connect/onboarding", fetcher);

  async function startOnboarding() {
    const res = await fetch("/api/stripe/connect/onboarding", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  const needsOnboarding = !connectStatus?.connected || !connectStatus?.onboardingCompleted;

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto">
      <SectionHeader title="Portefeuille" />

      <Card className="mb-4 bg-primary text-white">
        <p className="text-sm opacity-80">Solde disponible</p>
        <p className="text-3xl font-semibold mt-1">{Number(wallet?.availableAmount ?? 0).toFixed(2)} €</p>
        {Number(wallet?.pendingAmount ?? 0) > 0 && (
          <p className="text-xs opacity-70 mt-1">+ {Number(wallet.pendingAmount).toFixed(2)} € en attente</p>
        )}
      </Card>

      {needsOnboarding && (
        <Card className="mb-6">
          <p className="text-sm font-medium text-ink mb-1">Activez vos paiements</p>
          <p className="text-xs text-ink-muted mb-3">
            Pour recevoir vos contributions en tant que voyageur, complétez la vérification Stripe (identité, coordonnées bancaires).
          </p>
          <PrimaryButton onClick={startOnboarding}>Configurer mes paiements</PrimaryButton>
        </Card>
      )}

      <h2 className="text-sm font-medium text-ink-muted mb-3">Historique</h2>
      <div className="space-y-3">
        {wallet?.transactions?.length ? (
          wallet.transactions.map((t: any) => (
            <Card key={t.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink">Transfert réservation</p>
                <p className="text-xs text-ink-muted">{new Date(t.createdAt).toLocaleDateString("fr-FR")}</p>
              </div>
              <span className="text-sm font-medium text-success">+{Number(t.amount).toFixed(2)} €</span>
            </Card>
          ))
        ) : (
          <p className="text-sm text-ink-muted text-center py-6">Aucune transaction pour le moment.</p>
        )}
      </div>

    </main>
  );
}

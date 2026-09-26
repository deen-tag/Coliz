"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Card, PrimaryButton, StatusBadge, SecondaryButton } from "@/components/ui";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STEPS = [
  { status: "CONFIRMED", label: "Payé" },
  { status: "IN_PROGRESS", label: "Pris en charge" },
  { status: "COMPLETED", label: "Livré" },
];

export default function SuiviPage() {
  const { id } = useParams<{ id: string }>();
  const { data: booking, mutate } = useSWR(`/api/bookings/${id}`, fetcher);
  const { data: session } = useSession();
  const isTraveler = booking && (session?.user as any)?.id === booking.travelerId;

  async function advance(nextStatus: string) {
    await fetch(`/api/bookings/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    mutate();
  }

  async function reportIncident() {
    const description = window.prompt("Décrivez le problème rencontré :");
    if (!description) return;
    await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: id, category: "autre", description }),
    });
    mutate();
  }

  if (!booking) return null;

  const currentIndex = STEPS.findIndex((s) => s.status === booking.status);

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-1">Suivi du colis</h1>
      <p className="text-sm text-ink/60 mb-6">
        {booking.parcel.originLabel} → {booking.parcel.destinationLabel}
      </p>

      <Card className="mb-6">
        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <div key={step.status} className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  i <= currentIndex ? "bg-primary" : "bg-black/10"
                }`}
              />
              <span className={`text-sm ${i <= currentIndex ? "text-ink font-medium" : "text-ink/40"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {isTraveler && booking.status === "CONFIRMED" && (
        <PrimaryButton onClick={() => advance("IN_PROGRESS")} className="mb-3">
          Confirmer la prise en charge
        </PrimaryButton>
      )}
      {isTraveler && booking.status === "IN_PROGRESS" && (
        <PrimaryButton onClick={() => advance("COMPLETED")} className="mb-3">
          Confirmer la livraison
        </PrimaryButton>
      )}

      <SecondaryButton onClick={reportIncident}>Signaler un problème</SecondaryButton>
    </main>
  );
}

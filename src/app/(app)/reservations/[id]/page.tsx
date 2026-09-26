"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { Card, PrimaryButton, StatusBadge } from "@/components/ui";
import { StripeProvider } from "@/components/stripe-provider";
import { PaymentForm } from "@/components/payment-form";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ReservationPage() {
  const { id } = useParams<{ id: string }>();
  const { data: booking, mutate } = useSWR(`/api/bookings/${id}`, fetcher);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  async function startPayment() {
    const res = await fetch(`/api/bookings/${id}/pay`, { method: "POST" });
    const data = await res.json();
    if (data.clientSecret) setClientSecret(data.clientSecret);
  }

  if (!booking) return null;

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-1">Récapitulatif</h1>
      <StatusBadge status={booking.status} />

      <Card className="my-6 space-y-3">
        <Row label="Contribution voyageur" value={booking.contributionAmount} />
        <Row label="Frais de service Coliz" value={booking.platformFeeAmount} />
        <div className="border-t border-black/5 pt-3">
          <Row label="Total à payer" value={booking.totalAmount} bold />
        </div>
      </Card>

      {!clientSecret && booking.status !== "CONFIRMED" && (
        <PrimaryButton onClick={startPayment}>Procéder au paiement</PrimaryButton>
      )}

      {clientSecret && (
        <StripeProvider clientSecret={clientSecret}>
          <PaymentForm onSuccess={() => mutate()} />
        </StripeProvider>
      )}

      {booking.status === "CONFIRMED" && (
        <p className="text-sm text-success text-center mt-4">✓ Paiement confirmé, réservation en cours.</p>
      )}
    </main>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-medium text-ink" : "text-sm text-ink/70"}>{label}</span>
      <span className={bold ? "font-semibold text-ink text-lg" : "text-sm text-ink"}>
        {Number(value).toFixed(2)} €
      </span>
    </div>
  );
}

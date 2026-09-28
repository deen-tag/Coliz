"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Card, PrimaryButton, SecondaryButton, StatusBadge, SectionHeader, TransportModeBadge, VerifiedBadge, LoadingState } from "@/components/ui";
import { StripeProvider } from "@/components/stripe-provider";
import { PaymentForm } from "@/components/payment-form";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ReservationPage() {
  const { id } = useParams<{ id: string }>();
  const { data: booking, mutate } = useSWR(`/api/bookings/${id}`, fetcher);
  const { data: session } = useSession();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [negotiating, setNegotiating] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  const userId = (session?.user as any)?.id;
  const isSender = booking && userId === booking.senderId;
  const isTraveler = booking && userId === booking.travelerId;
  const counterpart = isSender ? booking?.traveler : booking?.sender;

  async function respond(action: "accept" | "refuse") {
    await fetch(`/api/bookings/${id}/${action}`, { method: "POST" });
    mutate();
  }

  async function cancel() {
    const paid = ["CONFIRMED"].includes(booking.status);
    const ok = window.confirm(
      paid
        ? "Annuler cette réservation ? Le remboursement dépend du délai avant le départ."
        : "Annuler cette réservation ?"
    );
    if (!ok) return;
    const res = await fetch(`/api/bookings/${id}/cancel`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCancelMsg(data.error ?? "Impossible d'annuler pour le moment.");
      return;
    }
    setCancelMsg(
      data.refundAmount > 0
        ? `Réservation annulée. ${Number(data.refundAmount).toFixed(2)} € vous seront remboursés.`
        : "Réservation annulée."
    );
    mutate();
  }

  async function startPayment() {
    const res = await fetch(`/api/bookings/${id}/pay`, { method: "POST" });
    const data = await res.json();
    if (data.clientSecret) setClientSecret(data.clientSecret);
  }

  if (!booking) return <LoadingState />;
  if (booking.error) return <LoadingState text="Cette réservation est introuvable ou ne vous est pas accessible." />;

  const canNegotiate = ["REQUESTED", "ACCEPTED"].includes(booking.status);

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-lg">
      <SectionHeader
        title={`${booking.trip.originLabel} → ${booking.trip.destinationLabel}`}
        subtitle={new Date(booking.trip.departureAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
        action={<StatusBadge status={booking.status} />}
      />

      <Card className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-primary-light flex items-center justify-center text-primary font-medium shrink-0">
          {counterpart?.firstName?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink">{counterpart?.firstName}</p>
          <p className="text-xs text-ink-muted">{isSender ? "Voyageur" : "Expéditeur"}</p>
        </div>
        <VerifiedBadge identity={Boolean(counterpart?.identityVerifiedAt)} email={true} />
      </Card>

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <TransportModeBadge mode={booking.trip.mode} />
          <Link href={`/messagerie/${id}`} className="text-sm font-medium text-primary">
            Message
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <Row label="Contribution voyageur" value={booking.contributionAmount} />
          <Row label="Frais de service Coliz" value={booking.platformFeeAmount} />
          <div className="border-t border-line pt-2">
            <Row label="Total à payer" value={booking.totalAmount} bold />
          </div>
        </div>
      </Card>

      {/* Accord — le voyageur doit se prononcer avant tout paiement (brief §11) */}
      {isTraveler && booking.status === "REQUESTED" && (
        <Card className="mb-4">
          <p className="text-sm text-ink mb-3">Cette demande attend votre réponse.</p>
          <div className="flex gap-2">
            <PrimaryButton onClick={() => respond("accept")}>Accepter</PrimaryButton>
            <SecondaryButton onClick={() => respond("refuse")}>Refuser</SecondaryButton>
          </div>
        </Card>
      )}
      {isSender && booking.status === "REQUESTED" && (
        <p className="text-sm text-ink-muted text-center mb-4">En attente de la réponse du voyageur.</p>
      )}

      {/* Négociation — un montant convenu s'applique directement (brief §12) */}
      {canNegotiate && (
        <div className="mb-4">
          {negotiating ? (
            <NegotiateForm bookingId={id} onDone={() => { setNegotiating(false); mutate(); }} />
          ) : (
            <button onClick={() => setNegotiating(true)} className="text-sm font-medium text-primary">
              Proposer un autre prix
            </button>
          )}
        </div>
      )}

      {isSender && ["ACCEPTED", "PAYMENT_PENDING"].includes(booking.status) && !clientSecret && (
        <PrimaryButton onClick={startPayment}>Procéder au paiement</PrimaryButton>
      )}

      {clientSecret && (
        <StripeProvider clientSecret={clientSecret}>
          <PaymentForm onSuccess={() => mutate()} />
        </StripeProvider>
      )}

      {cancelMsg && <p className="text-sm text-ink text-center my-4">{cancelMsg}</p>}
      {["REQUESTED", "ACCEPTED", "PAYMENT_PENDING", "CONFIRMED"].includes(booking.status) && (
        <button onClick={cancel} className="w-full text-center text-sm text-error py-3 mt-2">
          Annuler la réservation
        </button>
      )}

      {["CONFIRMED", "PICKED_UP", "IN_TRANSIT", "ARRIVED", "DELIVERED"].includes(booking.status) && (
        <Link href={`/suivi/${id}`}>
          <PrimaryButton>Voir le suivi du colis</PrimaryButton>
        </Link>
      )}
    </main>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-medium text-ink" : "text-ink-muted"}>{label}</span>
      <span className={bold ? "font-semibold text-ink text-lg" : "text-ink"}>
        {Number(value).toFixed(2)} €
      </span>
    </div>
  );
}

function NegotiateForm({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const value = Number(amount.replace(",", "."));
    if (!value || value <= 0) {
      setError("Montant invalide.");
      return;
    }
    const res = await fetch(`/api/bookings/${bookingId}/negotiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: value }),
    });
    if (res.ok) onDone();
    else setError("Impossible d'enregistrer ce montant.");
  }

  return (
    <Card>
      <p className="text-sm font-medium text-ink mb-2">Proposer un nouveau prix</p>
      <div className="flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="Montant en €"
          className="flex-1 rounded-control border border-line px-4 py-2.5 text-sm"
        />
        <button onClick={submit} className="rounded-control bg-primary text-white px-4 text-sm font-medium">
          Envoyer
        </button>
      </div>
      {error && <p className="text-xs text-error mt-2">{error}</p>}
    </Card>
  );
}

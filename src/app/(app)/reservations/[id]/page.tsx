"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Card, PrimaryButton, SecondaryButton, TransportModeBadge, VerifiedBadge, LoadingState } from "@/components/ui";
import { StripeProvider } from "@/components/stripe-provider";
import { PaymentForm } from "@/components/payment-form";
import { IconField } from "@/components/form-field";
import { EuroIcon, LockIcon, ChevronRightIcon } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { StatusBanner } from "@/components/status-banner";
import { formatPrice, formatTripDate, formatTripTime, shortCity } from "@/components/trip-parts";
import { bookingStatusInfo } from "@/lib/booking-status";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PAID_STATUSES = ["CONFIRMED", "PICKED_UP", "IN_PROGRESS", "IN_TRANSIT", "ARRIVED", "DELIVERED", "DELIVERY_FAILED", "COMPLETED"];

export default function ReservationPage() {
  const { id } = useParams<{ id: string }>();
  const [paid, setPaid] = useState(false);
  // Juste après le paiement, la confirmation arrive par webhook : on relit la réservation en attendant.
  const { data: booking, mutate } = useSWR(`/api/bookings/${id}`, fetcher, {
    refreshInterval: (latest: any) => (paid && ["ACCEPTED", "PAYMENT_PENDING"].includes(latest?.status) ? 2000 : 0),
  });
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
    const paidStatus = ["CONFIRMED"].includes(booking.status);
    const ok = window.confirm(
      paidStatus
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

  const role = isSender ? "sender" : "traveler";
  const name = counterpart?.firstName ?? "l'autre personne";
  const canNegotiate = ["REQUESTED", "ACCEPTED"].includes(booking.status);
  const awaitingConfirmation = paid && ["ACCEPTED", "PAYMENT_PENDING"].includes(booking.status);
  const info = awaitingConfirmation
    ? { title: "Paiement reçu", hint: "Nous confirmons votre réservation, cela ne prend que quelques secondes.", tone: "info" as const, actionNeeded: false }
    : bookingStatusInfo(booking.status, role, name);
  const departureTime = formatTripTime(booking.trip.departureAt);
  const trackingLabel =
    booking.status === "CONFIRMED"
      ? isSender
        ? "Voir mon code de remise"
        : "Saisir le code de remise"
      : "Voir le suivi du colis";

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-lg">
      {/* De quel envoi parle-t-on ? */}
      <div className="mb-4">
        <p className="text-sm text-ink-muted mb-1 capitalize">
          {formatTripDate(booking.trip.departureAt, "long")}
          {departureTime ? ` · ${departureTime}` : ""}
        </p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-ink leading-tight">
            {shortCity(booking.trip.originLabel)} <span className="text-ink-muted font-normal">→</span>{" "}
            {shortCity(booking.trip.destinationLabel)}
          </h1>
          <TransportModeBadge mode={booking.trip.mode} />
        </div>
      </div>

      {/* Où j'en suis, ce qu'on attend de moi */}
      <StatusBanner title={info.title} hint={info.hint} tone={info.tone} />

      {/* L'action principale de cette étape, jamais noyée parmi les autres */}
      <div className="mt-4 space-y-3">
        {isTraveler && booking.status === "REQUESTED" && (
          <div className="flex gap-2">
            <PrimaryButton onClick={() => respond("accept")}>Accepter la demande</PrimaryButton>
            <SecondaryButton onClick={() => respond("refuse")}>Refuser</SecondaryButton>
          </div>
        )}

        {isSender && ["ACCEPTED", "PAYMENT_PENDING"].includes(booking.status) && !clientSecret && !awaitingConfirmation && (
          <PrimaryButton onClick={startPayment}>Payer {formatPrice(booking.totalAmount)}</PrimaryButton>
        )}

        {clientSecret && !awaitingConfirmation && (
          <Card>
            <p className="flex items-center gap-2 font-semibold text-ink mb-1">
              <LockIcon size={16} className="text-success" />
              Paiement sécurisé
            </p>
            <p className="text-sm text-ink-muted">Le voyageur n&apos;est payé qu&apos;une fois le colis remis.</p>
            <StripeProvider clientSecret={clientSecret}>
              <PaymentForm
                amountLabel={formatPrice(booking.totalAmount)}
                onSuccess={() => {
                  setPaid(true);
                  setClientSecret(null);
                  mutate();
                }}
              />
            </StripeProvider>
          </Card>
        )}

        {PAID_STATUSES.includes(booking.status) && (
          <Link href={`/suivi/${id}`} className="block">
            <PrimaryButton>{trackingLabel}</PrimaryButton>
          </Link>
        )}
      </div>

      {/* Avec qui */}
      <Card className="mt-6 mb-4">
        <div className="flex items-center gap-3.5">
          <Avatar name={counterpart?.firstName} src={counterpart?.avatarUrl} size={48} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-muted">{isSender ? "Votre voyageur" : "L'expéditeur"}</p>
            <p className="font-semibold text-ink">{counterpart?.firstName}</p>
            <div className="mt-1.5">
              <VerifiedBadge identity={Boolean(counterpart?.identityVerifiedAt)} email={true} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t border-line">
          <Link
            href={`/messagerie/${id}`}
            className="flex-1 text-center rounded-control bg-primary-light text-primary text-sm font-medium py-2.5"
          >
            Écrire à {counterpart?.firstName}
          </Link>
          {isSender && counterpart?.id && (
            <Link
              href={`/voyageurs/${counterpart.id}`}
              className="flex items-center justify-center gap-0.5 rounded-control border border-line text-ink text-sm font-medium px-4 py-2.5"
            >
              Profil
              <ChevronRightIcon size={14} />
            </Link>
          )}
        </div>
      </Card>

      {/* Le colis */}
      {booking.parcel && (
        <Card className="mb-4">
          <p className="font-semibold text-ink mb-3">Le colis</p>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-ink-muted">Poids</dt>
              <dd className="font-semibold text-ink mt-0.5">{booking.parcel.weightKg} kg</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Dimensions</dt>
              <dd className="font-semibold text-ink mt-0.5">
                {booking.parcel.lengthCm}×{booking.parcel.widthCm}×{booking.parcel.heightCm} cm
              </dd>
            </div>
          </dl>
        </Card>
      )}

      {/* Le prix : ce que je paie, ou ce que je reçois */}
      <Card className="mb-4">
        <p className="text-sm text-ink-muted">{isSender ? "Total à payer" : "Vous recevez"}</p>
        <p className="text-3xl font-semibold text-ink leading-none mt-1.5">
          {formatPrice(isSender ? booking.totalAmount : booking.contributionAmount)}
        </p>
        <div className="space-y-2 text-sm mt-5 pt-5 border-t border-line">
          <Row label="Contribution du voyageur" value={booking.contributionAmount} />
          <Row label="Frais de service Coliz" value={booking.platformFeeAmount} />
        </div>
        {isSender && (
          <p className="flex items-start gap-2 text-xs text-ink-muted mt-4">
            <LockIcon size={14} className="text-success shrink-0 mt-0.5" />
            Votre paiement est protégé jusqu&apos;à la remise du colis.
          </p>
        )}
      </Card>

      {/* Négociation — un montant convenu s'applique directement */}
      {canNegotiate && (
        <div className="mb-4">
          {negotiating ? (
            <NegotiateForm bookingId={id} onDone={() => { setNegotiating(false); mutate(); }} />
          ) : (
            <button onClick={() => setNegotiating(true)} className="text-sm font-medium text-primary py-1">
              Proposer un autre prix
            </button>
          )}
        </div>
      )}

      {cancelMsg && <p className="text-sm text-ink text-center my-4">{cancelMsg}</p>}
      {["REQUESTED", "ACCEPTED", "PAYMENT_PENDING", "CONFIRMED"].includes(booking.status) && (
        <button onClick={cancel} className="w-full text-center text-sm text-error py-3 mt-2">
          Annuler la réservation
        </button>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink">{formatPrice(value)}</span>
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
        <div className="flex-1">
          <IconField
            icon={<EuroIcon size={18} />}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Montant en €"
          />
        </div>
        <button onClick={submit} className="rounded-control bg-primary text-white px-4 text-sm font-medium">
          Envoyer
        </button>
      </div>
      {error && <p className="text-xs text-error mt-2">{error}</p>}
    </Card>
  );
}

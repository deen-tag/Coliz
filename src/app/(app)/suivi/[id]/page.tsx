"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Card, PrimaryButton, StatusBadge, SecondaryButton } from "@/components/ui";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STEPS = [
  { status: "CONFIRMED", label: "Payé" },
  { status: "PICKED_UP", label: "Pris en charge" },
  { status: "DELIVERED", label: "Livré" },
  { status: "COMPLETED", label: "Voyageur payé" },
];

export default function SuiviPage() {
  const { id } = useParams<{ id: string }>();
  const { data: booking, mutate } = useSWR(`/api/bookings/${id}`, fetcher);
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const isSender = booking && userId === booking.senderId;
  const isTraveler = booking && userId === booking.travelerId;

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

      {/* Expéditeur : détient les deux codes du début à la fin. Il transmet
          le code de remise au voyageur en personne au départ, et gère lui-même
          — hors app — la transmission du code de réception au réceptionniste. */}
      {isSender && booking.status !== "CANCELLED" && (
        <div className="space-y-3 mb-6">
          <CodeCard bookingId={id} purpose="pickup" title="Code de remise" hint="À donner au voyageur au départ" />
          <CodeCard
            bookingId={id}
            purpose="delivery"
            title="Code de réception"
            hint="À transmettre vous-même au réceptionniste avant l'arrivée"
          />
        </div>
      )}

      {/* Voyageur : ne détient jamais un code à l'avance, il ne peut que le
          saisir une fois qu'on le lui a communiqué en personne. */}
      {isTraveler && booking.status === "CONFIRMED" && (
        <CodeEntry
          bookingId={id}
          endpoint="pickup-code"
          label="Code de remise"
          helper="Demandez ce code à l'expéditeur au moment où il vous confie le colis."
          onSuccess={mutate}
        />
      )}
      {isTraveler && booking.status === "PICKED_UP" && (
        <>
          <CodeEntry
            bookingId={id}
            endpoint="delivery-code"
            label="Code de réception"
            helper="Demandez ce code à la personne qui réceptionne le colis à l'arrivée."
            onSuccess={mutate}
          />
          <SecondaryButton className="mt-3" onClick={() => reportDeliveryIssue(id, mutate)}>
            Le réceptionniste est injoignable
          </SecondaryButton>
        </>
      )}

      {booking.status === "DELIVERY_FAILED" && (
        <p className="text-sm text-red-600 text-center mb-4">
          Livraison non finalisée — un incident a été ouvert, le colis reste avec le voyageur.
        </p>
      )}

      <SecondaryButton onClick={reportIncident}>Signaler un autre problème</SecondaryButton>
    </main>
  );
}

async function reportDeliveryIssue(bookingId: string, onDone: () => void) {
  const description = window.prompt("Décrivez la situation (réceptionniste absent, injoignable...) :");
  if (!description) return;
  const res = await fetch(`/api/bookings/${bookingId}/delivery/report-issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
  if (res.ok) onDone();
}

// Carte de consultation d'un code, côté expéditeur.
function CodeCard({
  bookingId,
  purpose,
  title,
  hint,
}: {
  bookingId: string;
  purpose: "pickup" | "delivery";
  title: string;
  hint: string;
}) {
  const { data, mutate } = useSWR(`/api/bookings/${bookingId}/${purpose}-code`, fetcher);

  return (
    <Card>
      <p className="text-sm font-medium text-ink mb-1">{title}</p>
      <p className="text-xs text-ink/50 mb-3">{hint}</p>
      {data?.code ? (
        <p className="text-3xl font-semibold tracking-widest text-primary">{data.code}</p>
      ) : (
        <div>
          <p className="text-sm text-ink/50 mb-2">Ce code n'est plus disponible (expiré ou déjà utilisé).</p>
          <SecondaryButton
            onClick={async () => {
              await fetch(`/api/bookings/${bookingId}/${purpose}-code`, { method: "POST" });
              mutate();
            }}
          >
            Régénérer le code
          </SecondaryButton>
        </div>
      )}
    </Card>
  );
}

// Saisie d'un code, côté voyageur.
function CodeEntry({
  bookingId,
  endpoint,
  label,
  helper,
  onSuccess,
}: {
  bookingId: string;
  endpoint: "pickup-code" | "delivery-code";
  label: string;
  helper: string;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}/${endpoint}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Code incorrect.");
      return;
    }
    setCode("");
    onSuccess();
  }

  return (
    <Card className="mb-3">
      <p className="text-sm font-medium text-ink mb-1">{label}</p>
      <p className="text-xs text-ink/50 mb-3">{helper}</p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        placeholder="000000"
        className="w-full rounded-control border border-black/10 px-4 py-3 text-lg tracking-widest text-center mb-2"
      />
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <PrimaryButton onClick={submit} disabled={loading || code.length < 4}>
        Valider
      </PrimaryButton>
    </Card>
  );
}

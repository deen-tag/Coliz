"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { PriceField, PriceGuide, parseEuroInput, priceInputError } from "@/components/price-guide";
import { formatEuro, type PriceBand } from "@/server/pricing-grid";
import { splitTotal } from "@/server/pricing";

// Négociation du prix d'une réservation : offre, contre-offre, acceptation, historique.
// Les montants sont TOUT COMPRIS (payés par l'expéditeur). Le serveur applique toutes les règles
// (minimum, droits, états) : cet écran ne fait que les rendre lisibles.

type Offer = {
  id: string;
  authorId: string;
  authorRole: "SENDER" | "TRAVELER";
  authorFirstName: string;
  amount: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED" | "WITHDRAWN";
  createdAt: string;
  respondedAt: string | null;
};

export type BookingPricing = {
  feeRate: number;
  band: (PriceBand & { feeRate?: number }) | null;
  offers: Offer[];
  pendingOffer: Offer | null;
};

const STATUS_LABEL: Record<Offer["status"], { text: string; className: string }> = {
  PENDING: { text: "En attente", className: "text-warning" },
  ACCEPTED: { text: "Acceptée", className: "text-success" },
  REJECTED: { text: "Refusée", className: "text-error" },
  COUNTERED: { text: "Contre-proposition reçue", className: "text-ink-muted" },
  WITHDRAWN: { text: "Remplacée", className: "text-ink-muted" },
};

export function NegotiationPanel({
  bookingId,
  status,
  isSender,
  counterpartName,
  pricing,
  weightKg,
  onChanged,
}: {
  bookingId: string;
  status: string;
  isSender: boolean;
  counterpartName: string;
  pricing: BookingPricing | undefined;
  weightKg: number;
  onChanged: () => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!pricing) return null;
  const { band, offers, pendingOffer, feeRate } = pricing;
  const myRole = isSender ? "SENDER" : "TRAVELER";
  const negotiable = ["REQUESTED", "ACCEPTED"].includes(status);
  const incoming = pendingOffer && pendingOffer.authorRole !== myRole ? pendingOffer : null;
  const outgoing = pendingOffer && pendingOffer.authorRole === myRole ? pendingOffer : null;

  const parsed = parseEuroInput(value);
  const inputError = priceInputError(value, band);
  const canSubmit = parsed !== null && !Number.isNaN(parsed) && !inputError && busy === null;

  async function call(key: string, url: string, body: unknown) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "L'opération n'a pas pu aboutir. Réessayez.");
        onChanged(); // l'état a peut-être changé (offre déjà traitée…) : on recharge
        return false;
      }
      onChanged();
      return true;
    } catch {
      setError("Problème de connexion. Réessayez dans un instant.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function submitOffer() {
    if (!canSubmit || parsed === null) return;
    const ok = await call("offer", `/api/bookings/${bookingId}/offers`, { amount: parsed });
    if (ok) {
      setFormOpen(false);
      setValue("");
    }
  }

  // Ce que toucherait le voyageur pour un prix tout compris donné (après frais de service Coliz).
  const travelerShare = (total: number) => splitTotal(total, feeRate).contributionAmount;

  return (
    <div className="mt-4 space-y-3">
      {negotiable && band && <PriceGuide band={band} weightKg={weightKg} />}

      {negotiable && incoming && (
        <Card className="!p-4 border-primary/30">
          <p className="text-sm text-ink">
            <span className="font-semibold">{incoming.authorFirstName}</span> propose{" "}
            <span className="font-semibold">{formatEuro(incoming.amount)}</span> tout compris.
          </p>
          {!isSender && (
            <p className="text-xs text-ink-muted mt-1">
              Vous recevriez {formatEuro(travelerShare(incoming.amount))}, après frais de service Coliz.
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => call("accept", `/api/bookings/${bookingId}/offers/${incoming.id}`, { action: "accept" })}
              disabled={busy !== null}
              className="flex-1 rounded-[14px] bg-primary text-white font-bold py-2.5 text-sm disabled:opacity-40"
            >
              {busy === "accept" ? "…" : "Accepter"}
            </button>
            <button
              onClick={() => call("reject", `/api/bookings/${bookingId}/offers/${incoming.id}`, { action: "reject" })}
              disabled={busy !== null}
              className="flex-1 rounded-[14px] bg-primary-light text-primary font-bold py-2.5 text-sm disabled:opacity-40"
            >
              {busy === "reject" ? "…" : "Refuser"}
            </button>
          </div>
          {!formOpen && (
            <button onClick={() => setFormOpen(true)} className="text-sm font-medium text-primary pt-3">
              Faire une contre-proposition
            </button>
          )}
        </Card>
      )}

      {negotiable && outgoing && (
        <Card className="!p-4">
          <p className="text-sm text-ink">
            Votre offre de <span className="font-semibold">{formatEuro(outgoing.amount)}</span> est en attente de la réponse de {counterpartName}.
          </p>
          {!formOpen && (
            <button onClick={() => setFormOpen(true)} className="text-sm font-medium text-primary pt-2">
              Modifier mon offre
            </button>
          )}
        </Card>
      )}

      {negotiable && !pendingOffer && !formOpen && (
        <button onClick={() => setFormOpen(true)} className="text-sm font-medium text-primary py-1">
          Proposer un autre prix
        </button>
      )}

      {negotiable && formOpen && (
        <Card className="!p-4">
          <p className="text-sm font-medium text-ink mb-2">{incoming ? "Votre contre-proposition" : "Proposer un prix"}</p>
          <PriceField label="Prix tout compris (€)" value={value} onChange={setValue} band={band} />
          {parsed !== null && !Number.isNaN(parsed) && !inputError && !isSender && (
            <p className="text-xs text-ink-muted mt-2">Vous recevriez {formatEuro(travelerShare(parsed))}, après frais de service Coliz.</p>
          )}
          <p className="text-xs text-ink-muted mt-2">
            Le nouveau prix ne s&apos;applique que si {counterpartName} l&apos;accepte. Le paiement reste bloqué d&apos;ici là.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={submitOffer}
              disabled={!canSubmit}
              className="flex-1 rounded-[14px] bg-primary text-white font-bold py-2.5 text-sm disabled:opacity-40"
            >
              {busy === "offer" ? "Envoi…" : "Envoyer"}
            </button>
            <button
              onClick={() => { setFormOpen(false); setError(null); }}
              className="rounded-[14px] bg-primary-light text-primary font-bold px-4 py-2.5 text-sm"
            >
              Annuler
            </button>
          </div>
        </Card>
      )}

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}

      {offers.length > 0 && (
        <div>
          <button onClick={() => setHistoryOpen((o) => !o)} className="text-sm font-medium text-ink-muted py-1">
            {historyOpen ? "Masquer" : "Voir"} l&apos;historique des offres ({offers.length})
          </button>
          {historyOpen && (
            <ul className="mt-2 rounded-control border border-line bg-surface divide-y divide-line">
              {[...offers].reverse().map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold text-ink">{formatEuro(o.amount)}</span>
                    <span className="text-ink-muted">
                      {" "}
                      · {o.authorRole === myRole ? "vous" : o.authorFirstName} ·{" "}
                      {new Date(o.createdAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </span>
                  <span className={`shrink-0 text-xs font-semibold ${STATUS_LABEL[o.status].className}`}>{STATUS_LABEL[o.status].text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

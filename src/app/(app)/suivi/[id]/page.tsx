"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Card, PrimaryButton, SecondaryButton, LoadingState } from "@/components/ui";
import { StarIcon } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { StatusBanner } from "@/components/status-banner";
import { VerticalTimeline } from "@/components/vertical-timeline";
import { RouteLine, formatTripMoment } from "@/components/trip-parts";
import { bookingStatusInfo, trackingTimeline } from "@/lib/booking-status";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SuiviPage() {
  const { id } = useParams<{ id: string }>();
  const { data: booking, mutate } = useSWR(`/api/bookings/${id}`, fetcher);
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const isSender = booking && userId === booking.senderId;
  const isTraveler = booking && userId === booking.travelerId;

  const [report, setReport] = useState<null | "incident" | "delivery">(null);

  async function submitReport(description: string) {
    if (report === "delivery") {
      const res = await fetch(`/api/bookings/${id}/delivery/report-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) return false;
    } else {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, category: "autre", description }),
      });
      if (!res.ok) return false;
    }
    setReport(null);
    mutate();
    return true;
  }

  if (!booking) return <LoadingState />;
  if (booking.error) return <LoadingState text="Ce suivi est introuvable ou ne vous est pas accessible." />;

  const role = isSender ? "sender" : "traveler";
  const counterpart = isSender ? booking.traveler : booking.sender;
  const info = bookingStatusInfo(booking.status, role, counterpart?.firstName);
  const timeline = trackingTimeline(booking.status);

  // Le code qui compte maintenant est mis en avant, l'autre reste discret.
  const pickupIsNow = booking.status === "CONFIRMED";
  const deliveryIsNow = ["PICKED_UP", "DELIVERY_FAILED"].includes(booking.status);

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-lg">
      {/* De quel colis s'agit-il */}
      <div className="mb-5">
        <p className="text-sm text-ink-muted mb-1.5">Suivi du colis</p>
        <RouteLine from={booking.parcel.originLabel} to={booking.parcel.destinationLabel} className="text-2xl" />
        <p className="text-sm text-ink-muted mt-2">{formatTripMoment(booking.trip.departureAt)}</p>
      </div>

      <StatusBanner title={info.title} hint={info.hint} tone={info.tone} />

      {/* Ce qu'il y a à faire maintenant passe avant tout le reste */}
      <div className="mt-4 space-y-3">
        {/* Expéditeur : détient les deux codes du début à la fin. Il transmet
            le code de remise au voyageur en personne au départ, et gère lui-même
            — hors app — la transmission du code de réception au réceptionniste. */}
        {isSender && booking.status !== "CANCELLED" && (
          <Card className="!p-0 divide-y divide-line overflow-hidden">
            <CodeRow
              bookingId={id}
              purpose="pickup"
              title="Code de remise"
              hint="À donner au voyageur au départ"
              emphasis={pickupIsNow}
            />
            <CodeRow
              bookingId={id}
              purpose="delivery"
              title="Code de réception"
              hint="À transmettre vous-même au réceptionniste avant l'arrivée"
              emphasis={deliveryIsNow}
            />
          </Card>
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
            <SecondaryButton onClick={() => setReport("delivery")}>Le réceptionniste est injoignable</SecondaryButton>
          </>
        )}

        {booking.status === "COMPLETED" && <ReviewForm bookingId={id} />}
      </div>

      {/* Avancement : directement sur le fond de page, sans carte */}
      {timeline && (
        <section className="mt-8">
          <h2 className="font-semibold text-ink mb-4">Où en est le colis</h2>
          <VerticalTimeline steps={timeline.steps} current={timeline.current} warning={timeline.warning} />
        </section>
      )}

      {/* Interlocuteur : une simple ligne, pas une carte de plus */}
      <div className="mt-8 pt-6 border-t border-line flex items-center gap-3">
        <Avatar name={counterpart?.firstName} src={counterpart?.avatarUrl} size={40} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-ink-muted">{isSender ? "Votre voyageur" : "L'expéditeur"}</p>
          <p className="font-semibold text-ink">{counterpart?.firstName}</p>
        </div>
        <Link
          href={`/messagerie/${id}`}
          className="rounded-control bg-primary-light text-primary text-sm font-medium px-4 py-2 shrink-0"
        >
          Message
        </Link>
      </div>

      {report ? (
        <ReportForm
          title={report === "delivery" ? "Réceptionniste injoignable" : "Signaler un problème"}
          placeholder={
            report === "delivery"
              ? "Décrivez la situation (absent, injoignable...)"
              : "Décrivez le problème rencontré"
          }
          onCancel={() => setReport(null)}
          onSubmit={submitReport}
        />
      ) : (
        <SecondaryButton className="mt-3" onClick={() => setReport("incident")}>
          Signaler un autre problème
        </SecondaryButton>
      )}
    </main>
  );
}

// Ligne de consultation d'un code, côté expéditeur. Le code "du moment" est
// grand et sur fond bleu clair ; l'autre reste une simple ligne.
function CodeRow({
  bookingId,
  purpose,
  title,
  hint,
  emphasis,
}: {
  bookingId: string;
  purpose: "pickup" | "delivery";
  title: string;
  hint: string;
  emphasis: boolean;
}) {
  const { data, mutate } = useSWR(`/api/bookings/${bookingId}/${purpose}-code`, fetcher);

  return (
    <div className="p-4">
      <p className={emphasis ? "font-semibold text-ink" : "text-sm font-medium text-ink"}>{title}</p>
      <p className="text-xs text-ink-muted mt-0.5 mb-3">{hint}</p>
      {data?.code ? (
        emphasis ? (
          <p className="text-4xl font-semibold tracking-widest text-primary text-center bg-primary-light rounded-control py-4">
            {data.code}
          </p>
        ) : (
          <p className="text-xl font-semibold tracking-widest text-ink">{data.code}</p>
        )
      ) : (
        <div>
          <p className="text-sm text-ink-muted mb-2">Ce code n'est plus disponible (expiré ou déjà utilisé).</p>
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
    </div>
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
      <p className="text-xs text-ink-muted mb-3">{helper}</p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        placeholder="000000"
        className="w-full rounded-control border border-line px-4 py-3 text-lg tracking-widest text-center mb-2"
      />
      {error && <p className="text-xs text-error mb-2">{error}</p>}
      <PrimaryButton onClick={submit} disabled={loading || code.length < 4}>
        Valider
      </PrimaryButton>
    </Card>
  );
}

// Formulaire d'avis — n'apparaît qu'une fois la livraison confirmée et le
// voyageur payé (brief §16), branché sur /api/reviews déjà existant.
function ReviewForm({ bookingId }: { bookingId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, rating, comment: comment || undefined }),
    });
    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Impossible d'envoyer l'avis pour l'instant.");
    }
  }

  if (sent) {
    return (
      <Card className="mb-3">
        <p className="text-sm text-success font-medium">Merci, votre avis a bien été envoyé.</p>
      </Card>
    );
  }

  return (
    <Card className="mb-3">
      <p className="text-sm font-medium text-ink mb-1">Laisser un avis</p>
      <p className="text-xs text-ink-muted mb-3">Votre expérience aide les prochains utilisateurs à choisir en confiance.</p>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} étoile${n > 1 ? "s" : ""}`}>
            <StarIcon size={24} className={n <= rating ? "text-primary" : "text-line"} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Un commentaire (optionnel)"
        rows={3}
        className="w-full rounded-control border border-line px-4 py-3 text-sm mb-2"
      />
      {error && <p className="text-xs text-error mb-2">{error}</p>}
      <PrimaryButton onClick={submit} disabled={rating === 0}>
        Envoyer l'avis
      </PrimaryButton>
    </Card>
  );
}

// Formulaire de signalement intégré à la page (plus agréable au téléphone
// que la fenêtre de saisie du navigateur).
function ReportForm({
  title,
  placeholder,
  onCancel,
  onSubmit,
}: {
  title: string;
  placeholder: string;
  onCancel: () => void;
  onSubmit: (description: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    setError(null);
    const ok = await onSubmit(text.trim());
    setSending(false);
    if (!ok) setError("Impossible d'envoyer pour le moment. Réessayez.");
  }

  return (
    <Card className="mt-3">
      <p className="text-sm font-medium text-ink mb-2">{title}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-control border border-line bg-surface px-4 py-3 text-sm mb-2"
      />
      {error && <p className="text-xs text-error mb-2">{error}</p>}
      <div className="flex gap-2">
        <PrimaryButton onClick={send} disabled={sending || text.trim().length < 5}>
          Envoyer
        </PrimaryButton>
        <SecondaryButton onClick={onCancel}>Annuler</SecondaryButton>
      </div>
    </Card>
  );
}

"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Card, PrimaryButton, SecondaryButton, LoadingState } from "@/components/ui";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { DateField } from "@/components/date-field";
import { IconField } from "@/components/form-field";
import { CalendarIcon, ScaleIcon, EuroIcon } from "@/components/icons";
import { JourneySteps } from "@/components/journey-steps";
import { AuthTripContext } from "@/components/auth-context";
import { formatPrice, formatTripDate, formatTripMoment, shortCity } from "@/components/trip-parts";

type Place = { label: string; lat: number; lng: number };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Parcours SANS trajet choisi (création d'un colis, puis recherche de trajets) :
// trois écrans, avec leur propre barre d'étapes.
const FORM_STEPS = ["Trajet", "Colis", "Confirmation"];

const STEP_TEXT: Record<1 | 2 | 3, { title: string; subtitle: string }> = {
  1: { title: "Où part votre colis ?", subtitle: "Indiquez le trajet et la date à laquelle vous souhaitez l'envoyer." },
  2: { title: "Que voulez-vous envoyer ?", subtitle: "Le poids et les dimensions permettent de trouver les voyageurs compatibles." },
  3: { title: "Vérifiez et confirmez", subtitle: "Dernière étape avant de voir les trajets disponibles." },
};

// Date locale au format attendu par le champ date (AAAA-MM-JJ).
function toDateInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// useSearchParams doit être sous <Suspense> (comme recherche, connexion, inscription),
// sinon le build Next.js échoue sur cette page statique.
export default function NouveauColisPage() {
  return (
    <Suspense fallback={null}>
      <NouveauColisContent />
    </Suspense>
  );
}

function NouveauColisContent() {
  const router = useRouter();
  const params = useSearchParams();
  // Venu d'un trajet précis : ses infos (départ, arrivée, date) sont déjà connues.
  const tripId = params.get("tripId");
  const { data: trip, isLoading: tripLoading } = useSWR(tripId ? `/api/trips/${tripId}` : null, fetcher);

  // Depuis un trajet : on saute l'écran "Où part votre colis ?" (écran 1) et on commence aux détails.
  const [step, setStep] = useState<1 | 2 | 3>(tripId ? 2 : 1);
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [form, setForm] = useState({
    desiredDate: "",
    weightKg: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    declaredValue: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Si le colis est créé mais que la demande échoue, on ne recrée pas un second colis au nouvel essai.
  const [createdParcelId, setCreatedParcelId] = useState<string | null>(null);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setCreatedParcelId(null);
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };
  }

  function parcelPayload(o: Place, d: Place, desiredDate: string) {
    return {
      originLabel: o.label,
      originLat: o.lat,
      originLng: o.lng,
      destinationLabel: d.label,
      destinationLat: d.lat,
      destinationLng: d.lng,
      desiredDate,
      weightKg: Number(form.weightKg),
      lengthCm: Number(form.lengthCm),
      widthCm: Number(form.widthCm),
      heightCm: Number(form.heightCm),
      declaredValue: Number(form.declaredValue),
      prohibitedItemsAccepted: accepted,
    };
  }

  // ---- Parcours SANS trajet : publier le colis puis voir les trajets (inchangé) ----
  async function handlePublish() {
    setError(null);
    if (!origin || !destination) {
      setError("Sélectionnez une ville de départ et d'arrivée dans la liste.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/parcels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parcelPayload(origin, destination, form.desiredDate)),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.fieldErrors ? "Vérifiez les champs saisis." : data.error ?? "Erreur lors de la publication.");
      return;
    }
    const parcel = await res.json();
    router.push(`/recherche?parcelId=${parcel.id}`);
  }

  // ---- Parcours DEPUIS un trajet : un seul clic crée le colis, envoie la demande et ouvre la réservation ----
  async function handleSendRequest() {
    setError(null);
    if (!trip || trip.error || !tripId) return;
    setLoading(true);
    try {
      let parcelId = createdParcelId;
      if (!parcelId) {
        const res = await fetch("/api/parcels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            parcelPayload(
              { label: trip.originLabel, lat: Number(trip.originLat), lng: Number(trip.originLng) },
              { label: trip.destinationLabel, lat: Number(trip.destinationLat), lng: Number(trip.destinationLng) },
              toDateInput(trip.departureAt)
            )
          ),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error?.fieldErrors ? "Vérifiez les champs saisis." : data.error?.message ?? (typeof data.error === "string" ? data.error : "Le colis n'a pas pu être enregistré."));
          setLoading(false);
          return;
        }
        parcelId = (await res.json()).id as string;
        setCreatedParcelId(parcelId);
      }

      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parcelId, tripId }),
      });
      if (!bookingRes.ok) {
        const data = await bookingRes.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "La demande n'a pas pu être envoyée. Réessayez dans un instant.");
        setLoading(false);
        return;
      }
      const booking = await bookingRes.json();
      // replace : le retour arrière ne ramène pas sur ce formulaire (pas de demande en double).
      router.replace(`/reservations/${booking.id}`);
    } catch {
      setError("Problème de connexion. Réessayez dans un instant.");
      setLoading(false);
    }
  }

  const canContinue =
    step === 1
      ? Boolean(origin && destination && form.desiredDate)
      : step === 2
        ? Number(form.weightKg) > 0 &&
          Number(form.lengthCm) > 0 &&
          Number(form.widthCm) > 0 &&
          Number(form.heightCm) > 0 &&
          form.declaredValue !== ""
        : accepted;

  // ---------- Depuis un trajet ----------
  if (tripId) {
    if (tripLoading) return <LoadingState />;
    const bookable = trip && !trip.error && trip.remainingParcels > 0 && ["PUBLISHED", "PARTIALLY_BOOKED"].includes(trip.status);
    if (!bookable) {
      return (
        <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto text-center">
          <p className="text-sm text-ink-muted py-10">Ce trajet n&apos;est plus disponible.</p>
          <Link href="/recherche">
            <PrimaryButton className="w-auto px-6">Chercher un autre trajet</PrimaryButton>
          </Link>
        </main>
      );
    }

    const name: string = trip.traveler?.firstName ?? "le voyageur";
    const tripText: Record<2 | 3, { title: string; subtitle: string }> = {
      2: { title: "Que voulez-vous envoyer ?", subtitle: `Ces informations sont transmises à ${name} avec votre demande.` },
      3: { title: "Vérifiez votre demande", subtitle: `Rien n'est payé maintenant : vous ne payez que si ${name} accepte.` },
    };
    const text = tripText[step === 3 ? 3 : 2];

    return (
      <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto">
        {/* On reste dans l'étape 3 du parcours global : pas de deuxième barre d'étapes. */}
        <JourneySteps current={3} />

        <AuthTripContext tripId={tripId} label="Votre trajet" />

        <h1 className="text-xl font-extrabold tracking-tight text-ink mb-1">{text.title}</h1>
        <p className="text-sm text-ink-muted mb-5">{text.subtitle}</p>

        <Card className="mb-6">
          {step !== 3 ? (
            <div className="space-y-4">
              <IconField label="Poids (kg)" type="number" value={form.weightKg} onChange={update("weightKg")} icon={<ScaleIcon size={18} />} />
              <div className="grid grid-cols-3 gap-3">
                <Field label="L (cm)" type="number" value={form.lengthCm} onChange={update("lengthCm")} />
                <Field label="l (cm)" type="number" value={form.widthCm} onChange={update("widthCm")} />
                <Field label="H (cm)" type="number" value={form.heightCm} onChange={update("heightCm")} />
              </div>
              <IconField label="Valeur déclarée (€)" type="number" value={form.declaredValue} onChange={update("declaredValue")} icon={<EuroIcon size={18} />} />
            </div>
          ) : (
            <div className="space-y-5">
              <dl className="space-y-3 text-sm">
                <SummaryRow label="Trajet" value={`${shortCity(trip.originLabel)} → ${shortCity(trip.destinationLabel)}`} />
                <SummaryRow label="Départ" value={formatTripMoment(trip.departureAt)} />
                <SummaryRow label="Voyageur" value={name} />
                <SummaryRow label="Poids" value={`${form.weightKg} kg`} />
                <SummaryRow label="Dimensions" value={`${form.lengthCm}×${form.widthCm}×${form.heightCm} cm`} />
                <SummaryRow label="Valeur déclarée" value={`${form.declaredValue} €`} />
                <SummaryRow label="Total si accepté" value={formatPrice(trip.totalAmount ?? trip.contributionAmount)} />
              </dl>
              <label className="flex items-start gap-3 text-sm text-ink pt-4 border-t border-line">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
                Je confirme avoir lu la liste des objets interdits et que mon colis n&apos;en contient aucun.
              </label>
              {error && <p className="text-sm text-error">{error}</p>}
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <PrimaryButton
            disabled={loading || !canContinue}
            onClick={() => (step === 3 ? handleSendRequest() : setStep(3))}
          >
            {step === 3 ? (loading ? "Envoi de la demande..." : `Envoyer ma demande à ${name}`) : "Continuer : vérifier"}
          </PrimaryButton>
          {step === 3 && (
            <SecondaryButton
              disabled={loading}
              onClick={() => {
                setCreatedParcelId(null);
                setStep(2);
              }}
            >
              Modifier mon colis
            </SecondaryButton>
          )}
        </div>
      </main>
    );
  }

  // ---------- Sans trajet : parcours d'origine, inchangé ----------
  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto">
      <JourneySteps current={step} steps={FORM_STEPS} />

      <h1 className="text-xl font-extrabold tracking-tight text-ink mb-1">{STEP_TEXT[step].title}</h1>
      <p className="text-sm text-ink-muted mb-5">{STEP_TEXT[step].subtitle}</p>

      <Card className="mb-6">
        {step === 1 && (
          <div className="space-y-4">
            <CityAutocomplete label="Ville de départ" value={origin} onSelect={setOrigin} />
            <CityAutocomplete label="Ville d'arrivée" value={destination} onSelect={setDestination} />
            <DateField
              label="Date souhaitée"
              value={form.desiredDate}
              onChange={(v) => setForm((f) => ({ ...f, desiredDate: v }))}
              icon={<CalendarIcon size={18} />}
            />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <IconField label="Poids (kg)" type="number" value={form.weightKg} onChange={update("weightKg")} icon={<ScaleIcon size={18} />} />
            <div className="grid grid-cols-3 gap-3">
              <Field label="L (cm)" type="number" value={form.lengthCm} onChange={update("lengthCm")} />
              <Field label="l (cm)" type="number" value={form.widthCm} onChange={update("widthCm")} />
              <Field label="H (cm)" type="number" value={form.heightCm} onChange={update("heightCm")} />
            </div>
            <IconField label="Valeur déclarée (€)" type="number" value={form.declaredValue} onChange={update("declaredValue")} icon={<EuroIcon size={18} />} />
          </div>
        )}
        {step === 3 && (
          <div className="space-y-5">
            <dl className="space-y-3 text-sm">
              <SummaryRow label="Trajet" value={`${shortCity(origin?.label ?? "")} → ${shortCity(destination?.label ?? "")}`} />
              <SummaryRow label="Date souhaitée" value={form.desiredDate ? formatTripDate(form.desiredDate) : "—"} />
              <SummaryRow label="Poids" value={`${form.weightKg} kg`} />
              <SummaryRow label="Dimensions" value={`${form.lengthCm}×${form.widthCm}×${form.heightCm} cm`} />
              <SummaryRow label="Valeur déclarée" value={`${form.declaredValue} €`} />
            </dl>
            <label className="flex items-start gap-3 text-sm text-ink pt-4 border-t border-line">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
              Je confirme avoir lu la liste des objets interdits et que mon colis n&apos;en contient aucun.
            </label>
            {error && <p className="text-sm text-error">{error}</p>}
          </div>
        )}
      </Card>

      <div className="space-y-3">
        <PrimaryButton
          disabled={loading || !canContinue}
          onClick={() => (step < 3 ? setStep((s) => (s + 1) as 1 | 2 | 3) : handlePublish())}
        >
          {step === 1 ? "Continuer : les détails du colis" : step === 2 ? "Continuer : vérifier" : loading ? "Publication..." : "Publier et voir les trajets"}
        </PrimaryButton>
        {step > 1 && (
          <SecondaryButton onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>Retour</SecondaryButton>
        )}
      </div>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium text-ink text-right">{value}</dd>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-ink mb-1.5">{label}</span>
      <input
        className="w-full rounded-control border border-line px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
        {...props}
      />
    </label>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton, SecondaryButton } from "@/components/ui";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { DateField } from "@/components/date-field";
import { IconField } from "@/components/form-field";
import { CalendarIcon, ScaleIcon, EuroIcon } from "@/components/icons";
import { JourneySteps } from "@/components/journey-steps";
import { AuthTripContext } from "@/components/auth-context";
import { formatTripDate, shortCity } from "@/components/trip-parts";

type Place = { label: string; lat: number; lng: number };

const FORM_STEPS = ["Trajet", "Colis", "Confirmation"];

const STEP_TEXT: Record<1 | 2 | 3, { title: string; subtitle: string }> = {
  1: { title: "Où part votre colis ?", subtitle: "Indiquez le trajet et la date à laquelle vous souhaitez l'envoyer." },
  2: { title: "Que voulez-vous envoyer ?", subtitle: "Le poids et les dimensions permettent de trouver les voyageurs compatibles." },
  3: { title: "Vérifiez et confirmez", subtitle: "Dernière étape avant de voir les trajets disponibles." },
};

export default function NouveauColisPage() {
  const router = useRouter();
  // Venu d'un trajet précis : on le rappelle en haut pour ne pas perdre le contexte.
  const [tripId, setTripId] = useState<string | null>(null);
  useEffect(() => {
    setTripId(new URLSearchParams(window.location.search).get("tripId"));
  }, []);
  const [step, setStep] = useState<1 | 2 | 3>(1);
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

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

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
      body: JSON.stringify({
        originLabel: origin.label,
        originLat: origin.lat,
        originLng: origin.lng,
        destinationLabel: destination.label,
        destinationLat: destination.lat,
        destinationLng: destination.lng,
        desiredDate: form.desiredDate,
        weightKg: Number(form.weightKg),
        lengthCm: Number(form.lengthCm),
        widthCm: Number(form.widthCm),
        heightCm: Number(form.heightCm),
        declaredValue: Number(form.declaredValue),
        prohibitedItemsAccepted: accepted,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.fieldErrors ? "Vérifiez les champs saisis." : data.error ?? "Erreur lors de la publication.");
      return;
    }
    const parcel = await res.json();
    // Venu d'un trajet précis : on y retourne avec le colis, prêt à réserver.
    router.push(tripId ? `/trajets/${tripId}?parcelId=${parcel.id}` : `/recherche?parcelId=${parcel.id}`);
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

  const publishLabel = tripId ? "Publier et revenir au trajet" : "Publier et voir les trajets";

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto">
      <JourneySteps current={step} steps={FORM_STEPS} />

      {tripId && <AuthTripContext tripId={tripId} label="Vous envoyez ce colis sur ce trajet" />}

      <h1 className="text-xl font-semibold text-ink mb-1">{STEP_TEXT[step].title}</h1>
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
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1"
              />
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
          {step === 1 ? "Continuer : les détails du colis" : step === 2 ? "Continuer : vérifier" : loading ? "Publication..." : publishLabel}
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
      <span className="block text-sm text-ink-muted mb-1.5">{label}</span>
      <input
        className="w-full rounded-control border border-line px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
        {...props}
      />
    </label>
  );
}

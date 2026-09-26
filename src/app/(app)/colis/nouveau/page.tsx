"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton } from "@/components/ui";
import { CityAutocomplete } from "@/components/city-autocomplete";

type Place = { label: string; lat: number; lng: number };

export default function NouveauColisPage() {
  const router = useRouter();
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
    router.push(`/recherche?parcelId=${parcel.id}`);
  }

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-1">Envoyer un colis</h1>
      <p className="text-sm text-ink/60 mb-6">Étape {step} sur 3</p>

      <Card className="mb-6">
        {step === 1 && (
          <div className="space-y-4">
            <CityAutocomplete label="Ville de départ" value={origin} onSelect={setOrigin} />
            <CityAutocomplete label="Ville d'arrivée" value={destination} onSelect={setDestination} />
            <Field label="Date souhaitée" type="date" value={form.desiredDate} onChange={update("desiredDate")} />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <Field label="Poids (kg)" type="number" value={form.weightKg} onChange={update("weightKg")} />
            <div className="grid grid-cols-3 gap-3">
              <Field label="L (cm)" type="number" value={form.lengthCm} onChange={update("lengthCm")} />
              <Field label="l (cm)" type="number" value={form.widthCm} onChange={update("widthCm")} />
              <Field label="H (cm)" type="number" value={form.heightCm} onChange={update("heightCm")} />
            </div>
            <Field label="Valeur déclarée (€)" type="number" value={form.declaredValue} onChange={update("declaredValue")} />
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-sm text-ink/80">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1"
              />
              Je confirme avoir lu la liste des objets interdits et que mon colis n'en contient aucun.
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </Card>

      <PrimaryButton
        disabled={loading || (step === 3 && !accepted)}
        onClick={() => (step < 3 ? setStep((s) => (s + 1) as any) : handlePublish())}
      >
        {step < 3 ? "Continuer" : loading ? "Publication..." : "Publier mon colis"}
      </PrimaryButton>
    </main>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-sm text-ink/70 mb-1.5">{label}</span>
      <input
        className="w-full rounded-control border border-black/10 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
        {...props}
      />
    </label>
  );
}

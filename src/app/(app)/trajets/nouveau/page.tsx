"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton } from "@/components/ui";
import { CityAutocomplete } from "@/components/city-autocomplete";

type Place = { label: string; lat: number; lng: number };

const MODES = [
  { value: "CAR", label: "Voiture" },
  { value: "TRAIN", label: "Train" },
  { value: "BUS", label: "Bus" },
  { value: "PLANE", label: "Avion" },
  { value: "VAN", label: "Camionnette" },
  { value: "FERRY", label: "Ferry" },
  { value: "MOTORCYCLE", label: "Moto" },
  { value: "BICYCLE", label: "Vélo" },
  { value: "OTHER", label: "Autre" },
];

export default function NouveauTrajetPage() {
  const router = useRouter();
  const [mode, setMode] = useState("CAR");
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!origin || !destination) {
      setError("Sélectionnez une ville de départ et d'arrivée dans la liste.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const payload = {
      originLabel: origin.label,
      originLat: origin.lat,
      originLng: origin.lng,
      destinationLabel: destination.label,
      destinationLat: destination.lat,
      destinationLng: destination.lng,
      departureAt: fd.get("departureAt"),
      ...(fd.get("arrivalAt") ? { arrivalAt: fd.get("arrivalAt") } : {}),
      mode,
      preexistingJourneyConfirmed: confirmed,
      capacityWeightKg: Number(fd.get("capacityWeightKg")),
      capacityLengthCm: Number(fd.get("capacityLengthCm") || 50),
      capacityWidthCm: Number(fd.get("capacityWidthCm") || 40),
      capacityHeightCm: Number(fd.get("capacityHeightCm") || 40),
      capacityParcels: Number(fd.get("capacityParcels") || 1),
      contributionAmount: Number(fd.get("contributionAmount")),
    };

    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.fieldErrors?.preexistingJourneyConfirmed?.[0] ?? "Vérifiez les informations saisies.");
      return;
    }
    router.push("/mes-voyages");
  }

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-6">Publier un trajet</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="space-y-4">
          <CityAutocomplete label="Ville de départ" value={origin} onSelect={setOrigin} />
          <CityAutocomplete label="Ville d'arrivée" value={destination} onSelect={setDestination} />
          <Field name="departureAt" label="Date et heure de départ" type="datetime-local" required />
          <Field name="arrivalAt" label="Arrivée estimée (optionnel)" type="datetime-local" />

          <label className="block">
            <span className="block text-sm text-ink-muted mb-1.5">Mode de transport</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full rounded-control border border-line bg-surface px-4 py-3 text-[15px]"
            >
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
        </Card>

        <Card className="space-y-4">
          <Field name="capacityWeightKg" label="Capacité disponible (kg)" type="number" required />
          <Field name="capacityParcels" label="Nombre de colis acceptés" type="number" defaultValue={1} />
          <Field name="contributionAmount" label="Ce que vous souhaitez recevoir (€)" type="number" step="0.01" required />
          <p className="text-xs text-ink-muted -mt-2">
            Coliz ajoute 15 % de frais de service : c&apos;est ce total que l&apos;expéditeur voit et paie.
          </p>
        </Card>

        {mode === "CAR" && (
          <Card>
            <label className="flex items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1"
              />
              Je confirme que ce trajet est prévu indépendamment du transport de colis (motif personnel, professionnel, etc.).
            </label>
          </Card>
        )}

        {error && <p className="text-sm text-error">{error}</p>}

        <PrimaryButton type="submit">Publier mon trajet</PrimaryButton>
      </form>
    </main>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-sm text-ink-muted mb-1.5">{label}</span>
      <input
        className="w-full rounded-control border border-line bg-surface px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
        {...props}
      />
    </label>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton } from "@/components/ui";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { DateField } from "@/components/date-field";
import { IconField, IconSelect } from "@/components/form-field";
import { CalendarIcon, CarIcon, TrainIcon, BusIcon, PlaneIcon, TruckIcon, FerryIcon, MotorcycleIcon, BicycleIcon, PackageIcon, ScaleIcon, EuroIcon, SuitcaseIcon } from "@/components/icons";
import { formatPrice } from "@/components/trip-parts";
import { PLATFORM_FEE_RATE, computeBookingAmounts } from "@/server/pricing";

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

const MODE_ICONS: Record<string, typeof CarIcon> = {
  CAR: CarIcon,
  TRAIN: TrainIcon,
  BUS: BusIcon,
  PLANE: PlaneIcon,
  VAN: TruckIcon,
  FERRY: FerryIcon,
  MOTORCYCLE: MotorcycleIcon,
  BICYCLE: BicycleIcon,
  OTHER: PackageIcon,
};

export default function NouveauTrajetPage() {
  const router = useRouter();
  const [mode, setMode] = useState("CAR");
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Montant saisi : sert à montrer tout de suite ce que le voyageur reçoit et ce que paie l'expéditeur.
  const [amount, setAmount] = useState("");
  const parsedAmount = Number(amount.replace(",", "."));
  const preview = parsedAmount > 0 ? computeBookingAmounts(parsedAmount) : null;
  const feePercent = Math.round(PLATFORM_FEE_RATE * 100);

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
      <div className="flex items-center gap-3 mb-6">
        <span className="w-11 h-11 rounded-control bg-primary-light text-primary flex items-center justify-center shrink-0">
          <SuitcaseIcon size={22} />
        </span>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-ink leading-tight">Publier un trajet</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Votre trajet peut vous rapporter. Profitez d&apos;un déplacement que vous faites déjà pour transporter un colis.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="space-y-4">
          <CityAutocomplete label="Ville de départ" value={origin} onSelect={setOrigin} />
          <CityAutocomplete label="Ville d'arrivée" value={destination} onSelect={setDestination} />
          <DateField
            name="departureAt"
            label="Date et heure de départ"
            type="datetime-local"
            required
            placeholder="Choisir la date et l'heure"
            icon={<CalendarIcon size={18} />}
          />
          <DateField
            name="arrivalAt"
            label="Arrivée estimée (optionnel)"
            type="datetime-local"
            placeholder="Choisir la date et l'heure"
            icon={<CalendarIcon size={18} />}
          />

          <IconSelect
            label="Mode de transport"
            icon={(() => {
              const ModeIcon = MODE_ICONS[mode] ?? PackageIcon;
              return <ModeIcon size={18} />;
            })()}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </IconSelect>
        </Card>

        <Card className="space-y-4">
          <IconField name="capacityWeightKg" label="Capacité disponible (kg)" type="number" required icon={<ScaleIcon size={18} />} />
          <IconField name="capacityParcels" label="Nombre de colis acceptés" type="number" defaultValue={1} icon={<PackageIcon size={18} />} />
          <IconField
            name="contributionAmount"
            label="Ce que vous souhaitez recevoir (€)"
            type="number"
            step="0.01"
            required
            icon={<EuroIcon size={18} />}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="rounded-control bg-primary-light px-4 py-3 text-sm -mt-1">
            {preview ? (
              <>
                <p className="text-xs text-ink-muted">Vous recevez</p>
                <p className="text-3xl font-extrabold tracking-tight text-primary leading-tight">
                  {formatPrice(preview.contributionAmount)}
                </p>
                <p className="text-xs text-ink-muted mt-1">
                  L&apos;expéditeur paie {formatPrice(preview.totalAmount)}, frais de service Coliz de {feePercent} % inclus.
                </p>
              </>
            ) : (
              <p className="text-xs text-ink-muted">
                Indiquez ce que vous souhaitez recevoir. Coliz ajoute {feePercent} % de frais de service : c&apos;est ce total que
                l&apos;expéditeur voit et paie.
              </p>
            )}
          </div>
          {mode === "CAR" && (
            <label className="flex items-start gap-3 text-sm text-ink border-t border-line pt-4">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1"
              />
              Je confirme que ce trajet est prévu indépendamment du transport de colis (motif personnel, professionnel, etc.).
            </label>
          )}
        </Card>

        {/* Ce qui se passe après : le voyageur sait où il va avant de s'engager */}
        <div className="px-1">
          <p className="text-sm font-semibold text-ink mb-2.5">Et ensuite ?</p>
          <ol className="space-y-2">
            {[
              "Les expéditeurs compatibles vous envoient une demande.",
              "Vous acceptez, refusez ou proposez un autre prix.",
              "Un code confirme la remise du colis, et vous êtes payé une fois le colis livré.",
            ].map((text, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary-light text-primary text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-[13.5px] text-ink-muted leading-snug">{text}</span>
              </li>
            ))}
          </ol>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <PrimaryButton type="submit">Publier mon trajet</PrimaryButton>
      </form>
    </main>
  );
}

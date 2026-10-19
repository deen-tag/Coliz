"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { IconField } from "@/components/form-field";
import { EuroIcon } from "@/components/icons";
import { checkAmount, formatEuro, type PriceBand } from "@/server/pricing-grid";

// Prix minimum et fourchette conseillée affichés dans les formulaires. Les montants viennent de
// /api/pricing/band (grille configurable) ; la même règle est ré-appliquée par le serveur à chaque
// colis, offre, réservation et paiement : ce composant n'est qu'un confort, pas la protection.

export type ClientBand = PriceBand & { feeRate: number };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Minimum et fourchette pour un poids saisi (attend la fin de la frappe). */
export function usePriceBand(weightKg: number, route?: { originLabel?: string | null; destinationLabel?: string | null }) {
  const weight = useDebounced(weightKg);
  const valid = Number.isFinite(weight) && weight > 0;
  const qs = new URLSearchParams({ weightKg: String(weight) });
  if (route?.originLabel) qs.set("originLabel", route.originLabel);
  if (route?.destinationLabel) qs.set("destinationLabel", route.destinationLabel);
  const { data } = useSWR<ClientBand | { error: string }>(valid ? `/api/pricing/band?${qs}` : null, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });
  return data && !("error" in data) ? data : null;
}

/** « 80,5 » ou « 80.5 » → 80.5 ; vide → null ; illisible → NaN. */
export function parseEuroInput(value: string): number | null {
  const v = value.trim().replace(",", ".");
  if (v === "") return null;
  return /^\d+(\.\d+)?$/.test(v) ? Number(v) : NaN;
}

/** Message d'erreur d'un prix saisi (null si vide ou valide) — mêmes règles que le serveur. */
export function priceInputError(value: string, band: PriceBand | null): string | null {
  const amount = parseEuroInput(value);
  if (amount === null || !band) return null;
  const check = checkAmount(amount, band);
  return check.ok ? null : check.message;
}

// « 80 » ou « 80,50 » (sans le symbole, pour écrire « 80 à 120 € »).
const plain = (n: number) => formatEuro(n).replace(" €", "");

export function PriceGuide({ band, weightKg, className = "" }: { band: PriceBand | null; weightKg?: number; className?: string }) {
  if (!band) {
    return (
      <div className={`rounded-control bg-primary-light px-4 py-3 text-sm text-ink-muted ${className}`}>
        Indiquez le poids du colis pour voir le prix minimum et la fourchette conseillée.
      </div>
    );
  }
  const weight = weightKg ?? band.weightKg;
  return (
    <div className={`rounded-control bg-primary-light px-4 py-3.5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <dl className="grid grid-cols-3 gap-3 flex-1 text-sm">
          <div>
            <dt className="text-xs text-ink-muted">Poids</dt>
            <dd className="font-semibold text-ink mt-0.5">{weight} kg</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Minimum</dt>
            <dd className="font-semibold text-ink mt-0.5">{formatEuro(band.minPrice)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Conseillé</dt>
            <dd className="font-semibold text-primary mt-0.5">
              {band.recommendedMin !== null && band.recommendedMax !== null
                ? `${plain(band.recommendedMin)} à ${formatEuro(band.recommendedMax)}`
                : "—"}
            </dd>
          </div>
        </dl>
        <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-primary">Négociable</span>
      </div>
      <p className="text-[13px] text-ink-muted leading-snug mt-3">
        {band.recommendedMin !== null && band.recommendedMax !== null ? (
          <>
            Prix conseillé pour votre colis : {plain(band.recommendedMin)} à {formatEuro(band.recommendedMax)}. Le prix minimum autorisé est de{" "}
            {formatEuro(band.minPrice)}.{" "}
          </>
        ) : (
          <>
            Ce poids dépasse notre grille de prix : le prix minimum autorisé est de {formatEuro(band.minPrice)}, à négocier librement au-delà.{" "}
          </>
        )}
        Vous pouvez négocier avec l&apos;autre particulier, dans le respect du minimum fixé par Coliz.
      </p>
    </div>
  );
}

/** Champ « prix » avec message d'erreur immédiat quand le montant est sous le minimum. */
export function PriceField({
  label,
  value,
  onChange,
  band,
  placeholder,
  optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  band: PriceBand | null;
  placeholder?: string;
  optional?: boolean;
}) {
  const error = priceInputError(value, band);
  const unreadable = value.trim() !== "" && Number.isNaN(parseEuroInput(value));
  return (
    <div>
      <IconField
        label={optional ? `${label} (facultatif)` : label}
        icon={<EuroIcon size={18} />}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        placeholder={placeholder ?? (band ? `${formatEuro(band.minPrice)} minimum` : "Montant en €")}
        aria-invalid={Boolean(error) || unreadable}
      />
      {(error || unreadable) && (
        <p className="text-sm text-error mt-1.5" role="alert">
          {error ?? "Saisissez un montant valide en euros."}
        </p>
      )}
    </div>
  );
}

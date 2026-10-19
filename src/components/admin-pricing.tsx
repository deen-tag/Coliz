"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Card, PrimaryButton } from "@/components/ui";

// Paramétrage de la tarification : grille de prix minimums / conseillés et commission.
// Les montants sont TOUT COMPRIS (payés par l'expéditeur). Aucun redéploiement n'est nécessaire :
// l'enregistrement s'applique immédiatement aux nouvelles offres, acceptations et paiements.

type Row = {
  label: string;
  originCountry: string;
  destinationCountry: string;
  minWeightKg: string;
  maxWeightKg: string;
  minPrice: string;
  recommendedMin: string;
  recommendedMax: string;
  surcharge: string;
  active: boolean;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const str = (n: unknown) => (n === null || n === undefined ? "" : String(n));
const num = (v: string) => Number(v.trim().replace(",", "."));

const EMPTY: Row = {
  label: "", originCountry: "", destinationCountry: "",
  minWeightKg: "", maxWeightKg: "", minPrice: "", recommendedMin: "", recommendedMax: "", surcharge: "0", active: true,
};

const COLUMNS: { key: keyof Row; label: string; width: string; numeric?: boolean }[] = [
  { key: "label", label: "Libellé", width: "w-36" },
  { key: "minWeightKg", label: "De (kg, exclu)", width: "w-20", numeric: true },
  { key: "maxWeightKg", label: "À (kg, inclus)", width: "w-20", numeric: true },
  { key: "minPrice", label: "Minimum (€)", width: "w-20", numeric: true },
  { key: "recommendedMin", label: "Conseillé de (€)", width: "w-20", numeric: true },
  { key: "recommendedMax", label: "à (€)", width: "w-20", numeric: true },
  { key: "surcharge", label: "Supplément (€)", width: "w-20", numeric: true },
  { key: "originCountry", label: "Pays départ", width: "w-28" },
  { key: "destinationCountry", label: "Pays arrivée", width: "w-28" },
];

export function AdminPricing() {
  const { data, mutate } = useSWR("/api/admin/pricing", fetcher, { revalidateOnFocus: false });
  const [rows, setRows] = useState<Row[]>([]);
  const [feePercent, setFeePercent] = useState("15");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!data || data.error || loaded) return;
    setRows(
      (data.tiers as any[]).map((t) => ({
        label: str(t.label), originCountry: str(t.originCountry), destinationCountry: str(t.destinationCountry),
        minWeightKg: str(t.minWeightKg), maxWeightKg: str(t.maxWeightKg), minPrice: str(t.minPrice),
        recommendedMin: str(t.recommendedMin), recommendedMax: str(t.recommendedMax), surcharge: str(t.surcharge ?? 0),
        active: t.active !== false,
      }))
    );
    setFeePercent(String(Math.round(Number(data.feeRate) * 1000) / 10));
    setLoaded(true);
  }, [data, loaded]);

  function setCell(i: number, key: keyof Row, value: string | boolean) {
    setRows((rs) => rs.map((r, k) => (k === i ? { ...r, [key]: value } : r)));
  }

  async function save() {
    setMessage(null);
    const fee = num(feePercent);
    if (!Number.isFinite(fee) || fee < 0 || fee > 50) {
      setMessage({ tone: "error", text: "La commission doit être comprise entre 0 et 50 %." });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feeRate: Math.round(fee * 10) / 1000,
        tiers: rows.map((r) => ({
          label: r.label || null,
          originCountry: r.originCountry || null,
          destinationCountry: r.destinationCountry || null,
          minWeightKg: num(r.minWeightKg),
          maxWeightKg: num(r.maxWeightKg),
          minPrice: num(r.minPrice),
          recommendedMin: num(r.recommendedMin),
          recommendedMax: num(r.recommendedMax),
          surcharge: r.surcharge.trim() === "" ? 0 : num(r.surcharge),
          active: r.active,
        })),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage({ tone: "error", text: typeof body.error === "string" ? body.error : "Enregistrement impossible : vérifiez les valeurs." });
      return;
    }
    setMessage({ tone: "ok", text: "Tarifs enregistrés. Ils s'appliquent immédiatement aux nouvelles offres et aux paiements." });
    setLoaded(false);
    mutate();
  }

  if (!data) return <p className="text-sm text-ink-muted">Chargement des tarifs…</p>;
  if (data.error) return <p className="text-sm text-ink-muted">Tarification indisponible.</p>;

  return (
    <section className="mb-10">
      <h2 className="text-sm font-medium text-ink-muted mb-3">Tarification</h2>
      <Card className="space-y-4">
        <p className="text-sm text-ink-muted">
          Prix <strong className="text-ink">tout compris</strong> payés par l&apos;expéditeur : la commission Coliz est prélevée dedans. Une tranche couvre
          ]« de » ; « à »] kg. Laissez les pays vides pour la règle par défaut ; renseignez-les pour une règle propre à un couloir
          (par ex. « Algérie »).
        </p>
        {data.usingDefaultTiers && (
          <p className="text-sm text-warning bg-warning-light rounded-control px-3 py-2">
            Grille de départ non enregistrée : ces valeurs sont déjà appliquées. Cliquez sur « Enregistrer » pour les rendre modifiables.
          </p>
        )}

        <div className="overflow-x-auto -mx-1 px-1">
          <table className="text-sm min-w-full">
            <thead>
              <tr className="text-left text-xs text-ink-muted">
                {COLUMNS.map((c) => <th key={c.key} className="font-medium pr-2 pb-2 whitespace-nowrap">{c.label}</th>)}
                <th className="font-medium pr-2 pb-2">Actif</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="pr-2 pb-2">
                      <input
                        value={r[c.key] as string}
                        onChange={(e) => setCell(i, c.key, e.target.value)}
                        inputMode={c.numeric ? "decimal" : "text"}
                        aria-label={`${c.label}, tranche ${i + 1}`}
                        className={`${c.width} rounded-control border border-line px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40`}
                      />
                    </td>
                  ))}
                  <td className="pr-2 pb-2">
                    <input type="checkbox" checked={r.active} onChange={(e) => setCell(i, "active", e.target.checked)} aria-label={`Tranche ${i + 1} active`} />
                  </td>
                  <td className="pb-2">
                    <button onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))} className="text-xs text-error px-1" aria-label={`Supprimer la tranche ${i + 1}`}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={() => setRows((rs) => [...rs, { ...EMPTY }])} className="text-sm font-medium text-primary">
          + Ajouter une tranche
        </button>

        <label className="block max-w-[200px]">
          <span className="block text-sm font-semibold text-ink mb-1.5">Commission Coliz (%)</span>
          <input
            value={feePercent}
            onChange={(e) => setFeePercent(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-control border border-line px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="block text-xs text-ink-muted mt-1">Prélevée dans le prix tout compris. Les réservations existantes gardent leur prix.</span>
        </label>

        {message && (
          <p className={`text-sm ${message.tone === "ok" ? "text-success" : "text-error"}`} role="alert">{message.text}</p>
        )}
        <PrimaryButton onClick={save} disabled={saving || rows.length === 0} className="sm:w-auto sm:px-8">
          {saving ? "Enregistrement…" : "Enregistrer les tarifs"}
        </PrimaryButton>
      </Card>
    </section>
  );
}

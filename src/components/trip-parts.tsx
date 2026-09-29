import { clsx } from "clsx";
import { LockIcon, CheckBadgeIcon, ShieldIcon } from "@/components/icons";

// Briques partagées par la recherche, les résultats, le détail d'un trajet
// et le profil voyageur : mêmes formats de date, de prix et de trajet partout.

export function shortCity(label: string) {
  return label.split(",")[0].trim();
}

export function formatPrice(amount: number | string) {
  return Number(amount).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function formatTripDate(iso: string | Date, style: "short" | "long" = "short") {
  return new Date(iso).toLocaleDateString(
    "fr-FR",
    style === "long"
      ? { weekday: "long", day: "numeric", month: "long" }
      : { weekday: "short", day: "numeric", month: "short" }
  );
}

// Renvoie null quand l'heure vaut 00:00 (heure non renseignée) plutôt que d'afficher "00:00".
export function formatTripTime(iso: string | Date): string | null {
  const d = new Date(iso);
  if (d.getHours() === 0 && d.getMinutes() === 0) return null;
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function formatTripMoment(iso: string | Date, style: "short" | "long" = "short") {
  const time = formatTripTime(iso);
  return `${formatTripDate(iso, style)}${time ? ` · ${time}` : ""}`;
}

// Trajet reconnaissable d'un coup d'œil : Ville ●┄┄┄● Ville.
export function RouteLine({ from, to, className }: { from: string; to: string; className?: string }) {
  return (
    <div className={clsx("flex items-center gap-2.5 min-w-0", className)}>
      <span className="font-semibold text-ink truncate max-w-[38%]">{shortCity(from)}</span>
      <span className="flex-1 flex items-center min-w-[20px]" aria-hidden>
        <span className="w-2.5 h-2.5 rounded-full border-2 border-primary bg-surface shrink-0" />
        <span className="flex-1 border-t-2 border-dashed border-line" />
        <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
      </span>
      <span className="font-semibold text-ink truncate max-w-[38%] text-right">{shortCity(to)}</span>
    </div>
  );
}

const TRUST = [
  { Icon: LockIcon, text: "Paiement protégé jusqu'à la remise" },
  { Icon: CheckBadgeIcon, text: "Remise confirmée par un code" },
  { Icon: ShieldIcon, text: "Profils vérifiés" },
];

// Réassurance discrète : rassure sans faire peur.
export function TrustStrip({ className }: { className?: string }) {
  return (
    <ul className={clsx("grid grid-cols-3 gap-2 text-center", className)}>
      {TRUST.map(({ Icon, text }) => (
        <li key={text} className="flex flex-col items-center gap-1.5 px-1">
          <Icon size={18} className="text-success" />
          <span className="text-[11px] leading-tight text-ink-muted">{text}</span>
        </li>
      ))}
    </ul>
  );
}

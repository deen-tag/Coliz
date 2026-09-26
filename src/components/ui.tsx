import { clsx } from "clsx";
import type { ButtonHTMLAttributes, HTMLAttributes } from "react";

export function Card({
  className,
  as: Tag = "div",
  ...props
}: HTMLAttributes<HTMLElement> & { as?: keyof JSX.IntrinsicElements }) {
  return (
    <Tag
      className={clsx("bg-surface rounded-card border border-black/5 p-5 shadow-sm", className)}
      {...(props as any)}
    />
  );
}

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "w-full rounded-control bg-primary text-white font-medium py-3.5 text-[15px]",
        "active:opacity-90 disabled:opacity-40 disabled:pointer-events-none transition-opacity",
        className
      )}
      {...props}
    />
  );
}

export function SecondaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "w-full rounded-control bg-primary-light text-primary font-medium py-3.5 text-[15px]",
        "active:opacity-80 transition-opacity",
        className
      )}
      {...props}
    />
  );
}

const STATUS_LABELS: Record<string, { label: string; tone: "neutral" | "info" | "success" | "warning" }> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  SEARCHING: { label: "Recherche en cours", tone: "info" },
  MATCHED: { label: "Correspondance trouvée", tone: "info" },
  BOOKED: { label: "Réservé", tone: "info" },
  PAID: { label: "Payé", tone: "success" },
  IN_TRANSIT: { label: "En transit", tone: "info" },
  DELIVERED: { label: "Livré", tone: "success" },
  CANCELLED: { label: "Annulé", tone: "warning" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, tone: "neutral" as const };
  const toneClass = {
    neutral: "bg-black/5 text-ink/70",
    info: "bg-primary-light text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-red-50 text-red-600",
  }[cfg.tone];

  return <span className={clsx("inline-block rounded-full px-3 py-1 text-xs font-medium", toneClass)}>{cfg.label}</span>;
}

// Badge "Profil vérifié" — n'affiche JAMAIS un simple "vérifié" opaque :
// le détail (identité, email) reste accessible au clic / en tooltip.
export function VerifiedBadge({ identity, email }: { identity: boolean; email: boolean }) {
  if (!identity || !email) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success px-3 py-1 text-xs font-medium">
      ✓ Profil vérifié
    </span>
  );
}

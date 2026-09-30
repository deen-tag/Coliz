import { clsx } from "clsx";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import type { TransportMode } from "@prisma/client";
import {
  PlaneIcon,
  TrainIcon,
  CarIcon,
  BusIcon,
  MotorcycleIcon,
  BicycleIcon,
  FerryIcon,
  TruckIcon,
  SuitcaseIcon,
  CheckBadgeIcon,
} from "@/components/icons";

export function Card({
  className,
  as: Tag = "div",
  ...props
}: HTMLAttributes<HTMLElement> & { as?: keyof JSX.IntrinsicElements }) {
  return (
    <Tag
      className={clsx("bg-surface rounded-card border border-line p-5 shadow-sm", className)}
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

const STATUS_LABELS: Record<string, { label: string; tone: "neutral" | "info" | "success" | "warning" | "error" }> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  SEARCHING: { label: "Recherche en cours", tone: "info" },
  MATCHED: { label: "Correspondance trouvée", tone: "info" },
  BOOKED: { label: "Réservé", tone: "info" },
  PAID: { label: "Payé", tone: "success" },
  PICKED_UP: { label: "Pris en charge", tone: "info" },
  IN_TRANSIT: { label: "En transit", tone: "info" },
  ARRIVED: { label: "À destination", tone: "info" },
  DELIVERED: { label: "Livré", tone: "success" },
  DELIVERY_FAILED: { label: "Livraison non finalisée", tone: "warning" },
  CLOSED: { label: "Terminé", tone: "success" },
  COMPLETED: { label: "Terminé", tone: "success" },
  CANCELLED: { label: "Annulé", tone: "error" },
  // Statuts Trip/Booking supplémentaires réutilisés par Mes colis / Mes voyages (étapes 6-7)
  PUBLISHED: { label: "Publié", tone: "info" },
  PARTIALLY_BOOKED: { label: "Partiellement réservé", tone: "info" },
  FULLY_BOOKED: { label: "Complet", tone: "neutral" },
  IN_PROGRESS: { label: "En cours", tone: "info" },
  ARCHIVED: { label: "Archivé", tone: "neutral" },
  REQUESTED: { label: "Demande envoyée", tone: "warning" },
  ACCEPTED: { label: "Accepté", tone: "info" },
  PAYMENT_PENDING: { label: "Paiement en attente", tone: "warning" },
  CONFIRMED: { label: "Confirmé", tone: "success" },
  INCIDENT: { label: "Incident signalé", tone: "error" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, tone: "neutral" as const };
  const toneClass = {
    neutral: "bg-black/5 text-ink-muted",
    info: "bg-primary-light text-primary",
    success: "bg-success-light text-success",
    warning: "bg-warning-light text-warning",
    error: "bg-error-light text-error",
  }[cfg.tone];

  return <span className={clsx("inline-block rounded-full px-3 py-1 text-xs font-medium", toneClass)}>{cfg.label}</span>;
}

// Badge "Profil vérifié" — n'affiche JAMAIS un simple "vérifié" opaque :
// le détail (identité, email) reste accessible au clic / en tooltip.
export function VerifiedBadge({ identity, email }: { identity: boolean; email: boolean }) {
  if (!identity || !email) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success-light text-success px-3 py-1 text-xs font-medium">
      <CheckBadgeIcon size={13} />
      Profil vérifié
    </span>
  );
}

// Alias sémantique de VerifiedBadge : "cette personne est encadrée par Coliz"
// plutôt qu'un dossier à analyser (DA §11).
export const TrustBadge = VerifiedBadge;

const TRANSPORT_MODE_CONFIG: Record<TransportMode, { label: string; Icon: (p: { size?: number; className?: string }) => JSX.Element }> = {
  CAR: { label: "Voiture", Icon: CarIcon },
  TRAIN: { label: "Train", Icon: TrainIcon },
  BUS: { label: "Bus", Icon: BusIcon },
  PLANE: { label: "Avion", Icon: PlaneIcon },
  MOTORCYCLE: { label: "Moto", Icon: MotorcycleIcon },
  BICYCLE: { label: "Vélo", Icon: BicycleIcon },
  VAN: { label: "Van", Icon: TruckIcon },
  FERRY: { label: "Ferry", Icon: FerryIcon },
  OTHER: { label: "Autre", Icon: SuitcaseIcon },
};

// Badge sobre de mode de transport — jamais un simple emoji (DA §2).
// variant="chip" (défaut) : fond + padding, pour une carte de résultat isolée.
// variant="plain" : icône + libellé sans fond, pour une insertion dans un
// conteneur déjà stylé (ex. la bande d'exemples de la homepage).
export function TransportModeBadge({
  mode,
  variant = "chip",
  className,
}: {
  mode: TransportMode;
  variant?: "chip" | "plain";
  className?: string;
}) {
  const cfg = TRANSPORT_MODE_CONFIG[mode] ?? TRANSPORT_MODE_CONFIG.OTHER;
  const { Icon } = cfg;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        variant === "chip" ? "rounded-control bg-black/[0.04] text-ink px-2.5 py-1" : "text-ink",
        className
      )}
    >
      <Icon size={14} className="text-ink-muted" />
      {cfg.label}
    </span>
  );
}

// Pastille "Expéditeur" / "Voyageur" : dit de quel côté on se trouve, dans la couleur du rôle.
export function RolePill({ role, className }: { role: "sender" | "traveler"; className?: string }) {
  return (
    <span
      data-role={role}
      className={clsx(
        "inline-block rounded-full bg-primary-light text-primary text-[11px] font-semibold px-2 py-0.5 leading-tight",
        className
      )}
    >
      {role === "sender" ? "Expéditeur" : "Voyageur"}
    </span>
  );
}

// En-tête de section cohérent : titre fort + sous-texte discret + action optionnelle.
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl font-semibold text-ink leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// État vide — explique toujours pourquoi la page est vide + l'action à faire (DA §25).
export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-14 px-4">
      <p className="font-medium text-ink mb-1.5">{title}</p>
      {description && <p className="text-sm text-ink-muted max-w-xs mx-auto mb-5">{description}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ text = "Chargement..." }: { text?: string }) {
  return <p className="text-sm text-ink-muted text-center py-16">{text}</p>;
}

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

// Champs de formulaire avec icône à gauche, partagés par tous les écrans.
// Le libellé est optionnel (recherche compacte, champ inline).
const BASE =
  "w-full rounded-control border border-line bg-surface py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-surface-alt disabled:text-ink-muted";

function Shell({ label, icon, children }: { label?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      {label && <span className="block text-sm text-ink-muted mb-1.5">{label}</span>}
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink">{icon}</span>
        )}
        {children}
      </span>
    </label>
  );
}

export function IconField({
  label,
  icon,
  className = "",
  ...props
}: { label?: string; icon?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Shell label={label} icon={icon}>
      <input className={`${BASE} ${icon ? "pl-11 pr-4" : "px-4"} ${className}`} {...props} />
    </Shell>
  );
}

export function IconSelect({
  label,
  icon,
  className = "",
  children,
  ...props
}: { label?: string; icon?: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Shell label={label} icon={icon}>
      <select className={`${BASE} ${icon ? "pl-11 pr-4" : "px-4"} ${className}`} {...props}>
        {children}
      </select>
    </Shell>
  );
}

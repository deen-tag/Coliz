"use client";

import { useState, type ReactNode } from "react";

// Champ date avec un texte visible quand il est vide : sur Android, une date
// non renseignée s'affiche comme une case blanche sans indication.
// L'icône calendrier du navigateur (à droite) est masquée : on affiche la nôtre, la même partout,
// et le champ entier reste cliquable pour ouvrir le calendrier (voir .date-input dans globals.css).
export function DateField({
  label,
  name,
  value,
  onChange,
  placeholder = "Choisir une date",
  className = "",
  icon,
  type = "date",
  required,
}: {
  label: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: ReactNode;
  type?: "date" | "datetime-local";
  required?: boolean;
}) {
  const [inner, setInner] = useState("");
  const current = value !== undefined ? value : inner;

  return (
    <label className="block">
      <span className="block text-sm font-semibold text-ink mb-1.5 whitespace-nowrap">{label}</span>
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink">{icon}</span>
        )}
        <input
          type={type}
          required={required}
          name={name}
          value={current}
          onChange={(e) => {
            setInner(e.target.value);
            onChange?.(e.target.value);
          }}
          className={`date-input w-full rounded-control border border-line bg-surface ${icon ? "pl-11 pr-4" : "px-4"} py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40 ${
            current ? "" : "text-transparent"
          } ${className}`}
        />
        {!current && (
          <span className={`pointer-events-none absolute inset-y-0 right-3 ${icon ? "left-11" : "left-4"} flex items-center overflow-hidden whitespace-nowrap text-[15px] text-ink-muted`}>
            {placeholder}
          </span>
        )}
      </span>
    </label>
  );
}

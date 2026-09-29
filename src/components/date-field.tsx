"use client";

import { useState, type ReactNode } from "react";

// Champ date avec un texte visible quand il est vide : sur Android, une date
// non renseignée s'affiche comme une case blanche sans indication.
export function DateField({
  label,
  name,
  value,
  onChange,
  placeholder = "Choisir une date",
  className = "",
  icon,
}: {
  label: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: ReactNode;
}) {
  const [inner, setInner] = useState("");
  const current = value !== undefined ? value : inner;

  return (
    <label className="block">
      <span className="block text-sm text-ink-muted mb-1.5 whitespace-nowrap">{label}</span>
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink">{icon}</span>
        )}
        <input
          type="date"
          name={name}
          value={current}
          onChange={(e) => {
            setInner(e.target.value);
            onChange?.(e.target.value);
          }}
          className={`w-full rounded-control border border-line bg-surface ${icon ? "pl-11 pr-4" : "px-4"} py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40 ${
            current ? "" : "text-transparent"
          } ${className}`}
        />
        {!current && (
          <span className={`pointer-events-none absolute inset-y-0 ${icon ? "left-11" : "left-4"} flex items-center text-[15px] text-ink-muted`}>
            {placeholder}
          </span>
        )}
      </span>
    </label>
  );
}

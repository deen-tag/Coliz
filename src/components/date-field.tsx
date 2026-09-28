"use client";

import { useState } from "react";

// Champ date avec un texte visible quand il est vide : sur Android, une date
// non renseignée s'affiche comme une case blanche sans indication.
export function DateField({
  label,
  name,
  value,
  onChange,
  placeholder = "Choisir une date",
  className = "",
}: {
  label: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [inner, setInner] = useState("");
  const current = value !== undefined ? value : inner;

  return (
    <label className="block">
      <span className="block text-sm text-ink-muted mb-1.5 whitespace-nowrap">{label}</span>
      <span className="relative block">
        <input
          type="date"
          name={name}
          value={current}
          onChange={(e) => {
            setInner(e.target.value);
            onChange?.(e.target.value);
          }}
          className={`w-full rounded-control border border-line bg-surface px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40 ${
            current ? "" : "text-transparent"
          } ${className}`}
        />
        {!current && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[15px] text-ink-muted">
            {placeholder}
          </span>
        )}
      </span>
    </label>
  );
}

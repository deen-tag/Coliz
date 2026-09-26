"use client";

import { useEffect, useRef, useState } from "react";

type Suggestion = { label: string; lat: number; lng: number };

export function CityAutocomplete({
  label,
  value,
  onSelect,
}: {
  label: string;
  value: { label: string; lat: number; lng: number } | null;
  onSelect: (v: Suggestion) => void;
}) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data);
    }, 250);
  }, [query]);

  return (
    <div className="relative">
      <label className="block">
        <span className="block text-sm text-ink/70 mb-1.5">{label}</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Ville"
          className="w-full rounded-control border border-black/10 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </label>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 bg-surface border border-black/10 rounded-control shadow-md max-h-56 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.label}>
              <button
                type="button"
                onMouseDown={() => {
                  setQuery(s.label);
                  onSelect(s);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-light"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Si aucune suggestion (pas de clé Mapbox configurée), la saisie libre
          reste utilisable — on retombe alors sur un géocodage approximatif
          côté serveur au moment de la création (à défaut de lat/lng précis). */}
    </div>
  );
}

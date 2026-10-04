"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Card, PrimaryButton } from "@/components/ui";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { searchQuery, type PlaceInput } from "@/lib/search-query";
import { CheckBadgeIcon, PackageIcon, SuitcaseIcon } from "@/components/icons";

type Role = "sender" | "traveler";

const TABS = [
  { role: "sender", label: "J'envoie un colis", hint: "Trouver un voyageur", Icon: PackageIcon },
  { role: "traveler", label: "Je voyage", hint: "J'emporte un colis", Icon: SuitcaseIcon },
] as const;

const TRAVELER_POINTS = [
  "Vous choisissez votre trajet",
  "Vous acceptez uniquement les demandes qui vous conviennent",
  "Vous êtes payé après la remise du colis",
];

// Le choix de l'accueil : deux grandes entrées toujours visibles, chacune dans sa couleur.
// Un seul bloc dessous change de contenu (recherche d'un côté, présentation de l'autre),
// donc rien n'est relégué en bas de page.
export function HeroChoice() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("sender");
  const [from, setFrom] = useState<PlaceInput>({ text: "" });
  const [to, setTo] = useState<PlaceInput>({ text: "" });

  function search(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/recherche?${searchQuery(from, to)}`);
  }

  return (
    <div data-role={role}>
      <div role="tablist" aria-label="Que voulez-vous faire ?" className="grid grid-cols-2 gap-3">
        {TABS.map(({ role: r, label, hint, Icon }) => {
          const active = role === r;
          return (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="accueil-panneau"
              data-role={r}
              onClick={() => setRole(r)}
              className={clsx(
                "relative flex flex-col items-start gap-3 rounded-card border-2 p-4 text-left transition-colors shadow-card",
                "sm:flex-row sm:items-center sm:gap-3",
                active ? "bg-primary text-white border-primary" : "bg-surface text-ink border-primary"
              )}
            >
              <span
                className={clsx(
                  "w-10 h-10 rounded-control flex items-center justify-center shrink-0",
                  active ? "bg-white/20 text-white" : "bg-primary-light text-primary"
                )}
              >
                <Icon size={22} />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold leading-tight">{label}</span>
                <span className={clsx("block text-xs mt-1 leading-tight", active ? "text-white/90" : "text-ink-muted")}>
                  {hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div id="accueil-panneau" role="tabpanel" className="mt-3">
        {role === "sender" ? (
          <Card>
            <p className="text-sm text-ink-muted mb-4">Trouvez un voyageur qui va là où vous envoyez votre colis.</p>
            <form onSubmit={search} className="space-y-3">
              <CityAutocomplete label="D'où part votre colis ?" placeholder="Ville, aéroport, gare ou port" onText={(t) => setFrom({ text: t })} onSelect={(c) => setFrom({ text: c.label, lat: c.lat, lng: c.lng })} />
              <CityAutocomplete label="Où va votre colis ?" placeholder="Ville, aéroport, gare ou port" onText={(t) => setTo({ text: t })} onSelect={(c) => setTo({ text: c.label, lat: c.lat, lng: c.lng })} />
              <PrimaryButton type="submit">Voir les trajets disponibles</PrimaryButton>
            </form>
            <p className="mt-4 text-center text-sm text-ink-muted">
              Aucun trajet ne convient ?{" "}
              <Link href="/colis/nouveau" className="font-semibold text-primary underline underline-offset-2">
                Publier mon colis
              </Link>
            </p>
          </Card>
        ) : (
          <Card className="!bg-primary-light !border-primary/20">
            <p className="font-semibold text-ink">Votre trajet peut vous rapporter.</p>
            <p className="text-sm text-ink-muted mt-1 mb-4">
              Profitez d&apos;un déplacement que vous faites déjà pour transporter un colis.
            </p>
            <ul className="space-y-3 text-sm text-ink">
              {TRAVELER_POINTS.map((text) => (
                <li key={text} className="flex items-start gap-2.5">
                  <CheckBadgeIcon size={18} className="text-primary shrink-0 mt-0.5" />
                  <span className="leading-snug">{text}</span>
                </li>
              ))}
            </ul>
            <Link href="/trajets/nouveau" className="block mt-5">
              <PrimaryButton>Publier mon trajet</PrimaryButton>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

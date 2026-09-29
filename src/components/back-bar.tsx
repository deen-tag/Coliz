"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronRightIcon } from "@/components/icons";

// Pages "racines" (onglets de la barre du bas) : pas de retour à proposer.
const ROOTS = ["/dashboard", "/recherche", "/activite", "/messagerie", "/parametres"];

// Retour affiché en haut de toutes les autres pages.
// Revient à la page précédente ; si on est arrivé directement sur la page
// (lien partagé, nouvel onglet), retombe sur un point de départ logique.
// Pour le visiteur, le libellé dit où l'on revient (résultats, trajet).
export function BackBar({ visitor = false }: { visitor?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname || ROOTS.includes(pathname)) return null;
  // La conversation a déjà son propre en-tête avec retour.
  if (pathname.startsWith("/messagerie/")) return null;

  const fallback = visitor ? "/recherche" : "/dashboard";
  const label = !visitor
    ? "Retour"
    : pathname.startsWith("/trajets/")
      ? "Retour aux résultats"
      : pathname.startsWith("/voyageurs/")
        ? "Retour au trajet"
        : "Retour";

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  }

  return (
    <div className={`sticky z-20 bg-surface-alt/95 backdrop-blur ${visitor ? "top-16" : "top-0 md:top-16"}`}>
      <div className="max-w-md md:max-w-2xl mx-auto px-4 pt-3">
        <button onClick={goBack} className="flex items-center gap-1 text-sm font-medium text-ink-muted py-1 pr-3">
          <ChevronRightIcon size={18} className="rotate-180" />
          {label}
        </button>
      </div>
    </div>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Les deux acteurs de Coliz. L'expéditeur garde le bleu pétrole de la marque, le voyageur a sa
// propre couleur (cuivre) en accent : on sait toujours dans quel "mode" on est.
export type Role = "sender" | "traveler";

// Pages qui ne parlent qu'au voyageur. Tout le reste est côté expéditeur (pétrole) ;
// les pages dont le rôle dépend de la réservation le précisent avec useRoleOverride.
const TRAVELER_PATHS = ["/trajets/nouveau", "/mes-voyages", "/portefeuille"];

export function roleFromPath(pathname: string | null): Role {
  if (!pathname) return "sender";
  return TRAVELER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? "traveler" : "sender";
}

type Override = { path: string | null; role: Role } | null;

const RoleContext = createContext<{ role: Role; setRoleOverride: (role: Role | null) => void }>({
  role: "sender",
  setRoleOverride: () => {},
});

// Pose le rôle sur toute la coquille (en-tête, contenu, barre du bas) sans la recolorer :
// les boutons principaux restent bleu pétrole, le cuivre vient des éléments data-role="traveler".
// `display: contents` : le conteneur n'influence pas la mise en page.
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [override, setOverride] = useState<Override>(null);

  // Le rôle imposé par une page ne vaut que pour cette page : en changeant d'adresse, on revient au défaut.
  const role: Role = override && override.path === pathname ? override.role : roleFromPath(pathname);

  const setRoleOverride = useCallback(
    (r: Role | null) => setOverride(r ? { path: pathname, role: r } : null),
    [pathname]
  );

  return (
    <RoleContext.Provider value={{ role, setRoleOverride }}>
      <div data-page-role={role} className="contents">
        {children}
      </div>
    </RoleContext.Provider>
  );
}

export function useRole(): Role {
  return useContext(RoleContext).role;
}

// Pour les pages dont le rôle dépend de la personne connectée (réservation, suivi, conversation,
// trajet dont on est le propriétaire). `null` tant que l'on ne sait pas : la couleur par défaut reste.
export function useRoleOverride(role: Role | null) {
  const { setRoleOverride } = useContext(RoleContext);
  useEffect(() => {
    if (role) setRoleOverride(role);
  }, [role, setRoleOverride]);
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { HomeIcon, SearchIcon, MessageIcon, UserIcon, ActivityIcon } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { useMyAvatar } from "@/components/use-my-avatar";

// Navigation mobile compacte (brief UI/UX §4) : Accueil / Rechercher / Activité / Messages / Profil.
// "Activité" regroupe Mes colis, Mes voyages, Réservations et Portefeuille sur /activite.
const TABS = [
  { href: "/dashboard", label: "Accueil", Icon: HomeIcon },
  { href: "/recherche", label: "Rechercher", Icon: SearchIcon },
  { href: "/activite", label: "Activité", Icon: ActivityIcon },
  { href: "/messagerie", label: "Messages", Icon: MessageIcon },
  { href: "/parametres", label: "Profil", Icon: UserIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  const { avatarUrl, firstName } = useMyAvatar();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-line pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md mx-auto grid grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center gap-1 py-2.5 text-xs",
                active ? "text-primary font-medium" : "text-ink-muted"
              )}
            >
              {href === "/parametres" && avatarUrl ? (
                <Avatar
                  name={firstName}
                  src={avatarUrl}
                  size={20}
                  className={clsx("ring-2", active ? "ring-primary" : "ring-transparent")}
                />
              ) : (
                <Icon size={20} />
              )}
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

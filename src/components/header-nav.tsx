"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Logo } from "@/components/logo";
import {
  SearchIcon,
  PackageIcon,
  SuitcaseIcon,
  MessageIcon,
  BellIcon,
  UserIcon,
} from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { useMyAvatar } from "@/components/use-my-avatar";

const LINKS = [
  { href: "/recherche", label: "Rechercher", Icon: SearchIcon },
  { href: "/mes-colis", label: "Mes colis", Icon: PackageIcon },
  { href: "/mes-voyages", label: "Mes voyages", Icon: SuitcaseIcon },
  { href: "/messagerie", label: "Messages", Icon: MessageIcon },
  { href: "/notifications", label: "Notifications", Icon: BellIcon },
];

// Navigation desktop persistante de l'espace connecté (brief UI/UX §4).
// Masquée sur mobile : la navigation mobile est gérée par <BottomNav />.
export function HeaderNav() {
  const pathname = usePathname();
  const { avatarUrl, firstName } = useMyAvatar();

  // CTA contextuel : "Proposer un trajet" dans l'espace transporteur,
  // "Envoyer un colis" partout ailleurs (brief UI/UX §4).
  const isTravelerContext = pathname?.startsWith("/mes-voyages") || pathname?.startsWith("/trajets");
  const cta = isTravelerContext
    ? { href: "/trajets/nouveau", label: "Proposer un trajet" }
    : { href: "/colis/nouveau", label: "Envoyer un colis" };

  return (
    <header className="hidden md:block sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <Link href="/dashboard" className="shrink-0">
          <Logo variant="primary" size={28} />
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map(({ href, label, Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-2 rounded-control px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary-light text-primary" : "text-ink-muted hover:text-ink"
                )}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/parametres"
            className={clsx(
              "flex items-center justify-center w-9 h-9 rounded-full",
              avatarUrl
                ? clsx("ring-2", pathname?.startsWith("/parametres") ? "ring-primary" : "ring-transparent")
                : pathname?.startsWith("/parametres")
                  ? "bg-primary-light text-primary"
                  : "bg-black/[0.04] text-ink-muted"
            )}
            aria-label="Profil"
          >
            {avatarUrl ? <Avatar name={firstName} src={avatarUrl} size={36} /> : <UserIcon size={17} />}
          </Link>
          <Link
            href={cta.href}
            className="rounded-control bg-primary text-white text-sm font-medium px-4 py-2.5 whitespace-nowrap"
          >
            {cta.label}
          </Link>
        </div>
      </div>
    </header>
  );
}

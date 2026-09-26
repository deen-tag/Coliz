"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { HomeIcon, SearchIcon, MessageIcon, WalletIcon } from "@/components/icons";

const TABS = [
  { href: "/dashboard", label: "Accueil", Icon: HomeIcon },
  { href: "/recherche", label: "Rechercher", Icon: SearchIcon },
  { href: "/messagerie", label: "Messages", Icon: MessageIcon },
  { href: "/portefeuille", label: "Portefeuille", Icon: WalletIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-surface border-t border-black/5 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center gap-1 py-2.5 text-xs",
                active ? "text-primary font-medium" : "text-ink/50"
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

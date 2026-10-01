import Link from "next/link";
import { Logo } from "@/components/logo";

// Navigation du visiteur non connecté : uniquement ce qu'il peut faire
// (comprendre Coliz, chercher un trajet, se connecter ou créer un compte).
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 bg-warm/95 backdrop-blur border-b border-line">
      <div className="h-[3px] bg-gradient-to-r from-sender to-traveler" aria-hidden />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="Accueil Coliz">
          <Logo variant="primary" size={24} />
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link href="/recherche" className="rounded-control px-3 py-2 text-ink-muted hover:text-ink">
            Rechercher un trajet
          </Link>
          <Link href="/#comment-ca-marche" className="rounded-control px-3 py-2 text-ink-muted hover:text-ink">
            Comment ça marche
          </Link>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Link href="/connexion" className="rounded-control px-3 py-2 text-sm font-medium text-ink">
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className="rounded-[14px] bg-primary text-white text-sm font-bold px-3.5 py-2.5 whitespace-nowrap"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </header>
  );
}

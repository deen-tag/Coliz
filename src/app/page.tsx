import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { Logo } from "@/components/logo";
import { HeroChoice } from "@/components/hero-choice";
import { HowItWorks } from "@/components/how-it-works";
import { ShieldIcon, LockIcon, MapPinIcon, CheckBadgeIcon, CarIcon, PlaneIcon, FerryIcon } from "@/components/icons";

// Trajets réels les plus concernés par la diaspora maghrébine en France
// (Paris, Marseille, Lyon, Lille). Un appui lance directement la recherche.
const FREQUENT_ROUTES: { route: string; mode: "PLANE" | "CAR" | "FERRY" }[] = [
  { route: "Paris → Marseille", mode: "CAR" },
  { route: "Paris → Lille", mode: "CAR" },
  { route: "Paris → Alger", mode: "PLANE" },
  { route: "Marseille → Alger", mode: "FERRY" },
  { route: "Lyon → Casablanca", mode: "PLANE" },
  { route: "Marseille → Tunis", mode: "PLANE" },
];

// Réassurance portée par Coliz plutôt que par une enquête de l'utilisateur
// sur chaque transporteur (cahier des charges §3, brief UI/UX §7).
const TRUST_ITEMS = [
  { Icon: ShieldIcon, label: "Identité vérifiée", text: "Des utilisateurs vérifiés et fiables." },
  { Icon: LockIcon, label: "Paiement sécurisé", text: "Votre paiement est protégé jusqu'à la remise." },
  { Icon: MapPinIcon, label: "Colis suivi", text: "Suivez son acheminement à chaque étape." },
  { Icon: CheckBadgeIcon, label: "Remise par code", text: "Un code confirme chaque remise." },
];

// Icônes en petit format pour la bande "Trajets fréquents" — indépendant de
// TransportModeBadge, dont les tailles/paddings sont pensés pour les cartes
// de résultats, pas pour un si petit format.
function TransportModeIcon({ mode, size, className }: { mode: "PLANE" | "CAR" | "FERRY"; size: number; className?: string }) {
  const Icon = { CAR: CarIcon, PLANE: PlaneIcon, FERRY: FerryIcon }[mode];
  return <Icon size={size} className={className} />;
}

export default async function HomePage() {
  // Connecté : on propose l'accès à l'espace plutôt que la connexion.
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen bg-warm">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
        <Logo variant="primary" size={28} />
        <div className="flex gap-2">
          {session ? (
            <Link href="/dashboard" className="text-sm font-medium bg-primary text-white rounded-control px-4 py-2.5">
              Mon espace
            </Link>
          ) : (
            <>
              <Link href="/connexion" className="text-sm font-medium text-ink-muted px-3 py-2">
                Se connecter
              </Link>
              <Link href="/inscription" className="text-sm font-medium bg-primary text-white rounded-control px-4 py-2.5">
                Créer un compte
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Accueil : deux grandes entrées toujours visibles (bleu = j'envoie, teal = je voyage).
          Sur ordinateur, le titre se pose sur la moitié vide de l'illustration ; sur téléphone
          l'illustration est retirée pour que le choix soit visible sans défiler. */}
      <section className="max-w-4xl mx-auto sm:px-4">
        <div className="relative">
          <div className="relative z-10 px-4 pt-2 pb-5 sm:p-0 sm:absolute sm:inset-y-0 sm:left-0 sm:w-[48%] sm:flex sm:flex-col sm:justify-center sm:pl-8 sm:pr-1">
            <h1 className="text-[30px] leading-[1.1] sm:text-3xl md:text-[40px] font-semibold text-ink tracking-tight">
              Vos colis voyagent avec ceux qui voyagent.
            </h1>
            <p className="mt-3 text-ink-muted text-base sm:text-sm md:text-base">
              Envoyez un colis avec un voyageur, ou gagnez de l&apos;argent sur un trajet que vous faites déjà.
            </p>
          </div>
          <div className="hidden sm:block relative aspect-[3/2] w-full">
            <Image
              src="/brand/hero.webp"
              alt=""
              fill
              priority
              sizes="896px"
              className="object-cover pointer-events-none select-none"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="relative z-10 px-4 sm:px-0 sm:-mt-14 max-w-2xl mx-auto pb-10">
          <HeroChoice />

          {/* Un appui sur un trajet lance directement la recherche correspondante. */}
          <div className="mt-10">
            <h2 className="text-xl sm:text-2xl font-bold text-ink">Trajets fréquents</h2>
            <p className="text-sm text-ink-muted mt-1 mb-4">
              Ces trajets sont souvent recherchés par notre communauté. Touchez-en un pour voir les voyageurs disponibles.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FREQUENT_ROUTES.map(({ route, mode }) => {
                const [from, to] = route.split(" → ");
                return (
                  <Link
                    key={route}
                    href={`/recherche?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
                    className="flex items-center gap-2 rounded-2xl bg-surface border border-line px-3 py-2.5 text-[13px] sm:text-sm font-semibold text-ink leading-tight active:bg-sender-light hover:border-sender/40 transition-colors"
                  >
                    <TransportModeIcon mode={mode} size={16} className="text-sender shrink-0" />
                    <span className="min-w-0">
                      {from}
                      <br />
                      {to}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Réassurance — la confiance est portée par Coliz, pas par une enquête utilisateur */}
      <section className="bg-surface border-y border-line py-10">
        <div className="max-w-3xl mx-auto px-4 text-center mb-8">
          <h2 className="text-xl font-semibold text-ink mb-1">Transportez en toute confiance</h2>
          <p className="text-sm text-ink-muted">Votre colis est entre de bonnes mains.</p>
        </div>
        <div className="max-w-3xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {TRUST_ITEMS.map(({ Icon, label, text }) => (
            <div key={label}>
              <Icon size={26} className="text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-ink">{label}</p>
              <p className="text-xs text-ink-muted mt-1">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="comment-ca-marche" className="max-w-3xl mx-auto px-4 py-14 scroll-mt-20">
        <h2 className="text-xl font-semibold text-ink text-center mb-6">Comment ça marche ?</h2>
        <HowItWorks />
      </section>

      <footer className="text-center text-xs text-ink-muted/70 pb-10">
        Coliz est une marketplace mettant en relation expéditeurs et voyageurs. Coliz n&apos;est ni transporteur ni assureur.
      </footer>
    </main>
  );
}

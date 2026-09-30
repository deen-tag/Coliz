import Link from "next/link";
import Image from "next/image";
import { DateField } from "@/components/date-field";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { Logo } from "@/components/logo";
import { PrimaryButton, Card } from "@/components/ui";
import { IconField } from "@/components/form-field";
import { HowItWorks } from "@/components/how-it-works";
import { ShieldIcon, LockIcon, MapPinIcon, CheckBadgeIcon, SuitcaseIcon, PackageIcon, CalendarIcon, ClockIcon, CarIcon, PlaneIcon, FerryIcon } from "@/components/icons";

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
        <Logo variant="primary" size={32} />
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

      {/* Accueil : deux portes d'entrée, une par acteur, chacune dans sa couleur.
          Bleu = j'envoie un colis (recherche ouverte d'emblée), teal = je voyage.
          L'illustration (décorative, alt vide) garde sa moitié gauche vide pour le titre :
          sur ordinateur le titre s'y pose, sur téléphone il passe au-dessus. */}
      <section className="max-w-4xl mx-auto sm:px-4">
        <div className="relative">
          <div className="relative z-10 px-4 pt-4 pb-4 sm:p-0 sm:absolute sm:inset-y-0 sm:left-0 sm:w-[48%] sm:flex sm:flex-col sm:justify-center sm:pl-8 sm:pr-1">
            <h1 className="text-[28px] leading-[1.1] sm:text-3xl md:text-[40px] font-semibold text-ink tracking-tight">
              Vos colis voyagent avec ceux qui voyagent.
            </h1>
            <p className="mt-3 text-ink-muted text-base sm:text-sm md:text-base">
              Envoyez un colis avec un voyageur, ou gagnez de l&apos;argent sur un trajet que vous faites déjà.
            </p>
            <a href="#voyageur" className="sm:hidden mt-2 inline-block text-sm font-medium text-traveler">
              Vous voyagez ? Gagnez de l&apos;argent ↓
            </a>
          </div>
          <div className="relative h-44 sm:h-auto sm:aspect-[3/2] w-full">
            <Image
              src="/brand/hero.webp"
              alt=""
              fill
              priority
              sizes="(min-width: 896px) 896px, 100vw"
              className="object-cover object-[70%_70%] sm:object-center pointer-events-none select-none"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="relative z-10 px-4 sm:px-0 -mt-6 sm:-mt-14 pb-10 grid gap-4 md:grid-cols-5">
          {/* Porte expéditeur : la recherche est directement là */}
          <Card data-role="sender" className="md:col-span-3 border-t-4 border-t-primary">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-11 h-11 rounded-control bg-primary-light text-primary flex items-center justify-center shrink-0">
                <PackageIcon size={22} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-ink leading-tight">J&apos;envoie un colis</h2>
                <p className="text-sm text-ink-muted mt-0.5">Trouvez un voyageur qui fait déjà le trajet.</p>
              </div>
            </div>
            <form action="/recherche" className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <IconField name="from" label="Départ" placeholder="Ville de départ" icon={<MapPinIcon size={18} />} />
                <IconField name="to" label="Destination" placeholder="Ville d'arrivée" icon={<MapPinIcon size={18} />} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DateField name="date" label="Date de départ" placeholder="Toutes les dates" icon={<CalendarIcon size={18} />} />
                <label className="block">
                  <span className="block text-sm text-ink-muted mb-1.5 whitespace-nowrap">Période flexible</span>
                  <span className="relative block">
                    <ClockIcon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink" />
                    <select
                      name="flex"
                      defaultValue="3"
                      className="w-full rounded-control border border-line bg-surface pl-11 pr-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="0">Date exacte</option>
                      <option value="3">± 3 jours</option>
                      <option value="7">± 7 jours</option>
                      <option value="15">± 15 jours</option>
                    </select>
                  </span>
                </label>
              </div>
              <PrimaryButton type="submit">Voir les possibilités</PrimaryButton>
            </form>
          </Card>

          {/* Porte voyageur : son propre bloc, sa propre couleur */}
          <Card
            id="voyageur"
            data-role="traveler"
            className="md:col-span-2 flex flex-col bg-primary-light border-primary/20 scroll-mt-20"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="w-11 h-11 rounded-control bg-surface text-primary flex items-center justify-center shrink-0">
                <SuitcaseIcon size={22} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-ink leading-tight">Je voyage, je gagne de l&apos;argent</h2>
                <p className="text-sm text-ink-muted mt-0.5">Vous avez déjà prévu un trajet ?</p>
              </div>
            </div>
            <ul className="space-y-2.5 text-sm text-ink">
              {[
                "Vous choisissez vos dates et ce que vous souhaitez recevoir.",
                "Vous acceptez ou refusez chaque demande.",
                "Paiement protégé, versé une fois le colis livré.",
              ].map((text) => (
                <li key={text} className="flex items-start gap-2.5">
                  <CheckBadgeIcon size={18} className="text-primary shrink-0 mt-0.5" />
                  <span className="leading-snug">{text}</span>
                </li>
              ))}
            </ul>
            <Link href="/trajets/nouveau" className="block mt-auto pt-5">
              <PrimaryButton>Proposer un trajet</PrimaryButton>
            </Link>
          </Card>
        </div>

        {/* Un appui sur un trajet lance directement la recherche correspondante. */}
        <div className="px-4 sm:px-0 pb-14 max-w-2xl mx-auto">
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
                  className="flex items-center gap-2 rounded-2xl bg-sender-light/70 px-3 py-2.5 text-[13px] sm:text-sm font-semibold text-ink leading-tight active:bg-sender-light hover:bg-sender-light transition-colors"
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
      </section>

      {/* Réassurance — la confiance est portée par Coliz, pas par une enquête utilisateur */}
      <section className="bg-primary-light py-12">
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

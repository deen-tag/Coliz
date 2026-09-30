import Link from "next/link";
import Image from "next/image";
import { DateField } from "@/components/date-field";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { Logo } from "@/components/logo";
import { PrimaryButton, Card } from "@/components/ui";
import { IconField } from "@/components/form-field";
import { ShieldIcon, LockIcon, MapPinIcon, CheckBadgeIcon, SuitcaseIcon, CalendarIcon, ClockIcon, CarIcon, PlaneIcon, FerryIcon } from "@/components/icons";

// Trajets réels les plus concernés par la diaspora maghrébine en France
// (Paris, Marseille, Lyon, Lille) — à titre indicatif, non cliquables.
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

const STEPS = [
  { n: 1, title: "Recherchez", text: "Départ, destination et période : Coliz trouve les trajets compatibles." },
  { n: 2, title: "Comparez", text: "Plusieurs possibilités : prix, délai, mode de transport et transporteur." },
  { n: 3, title: "Réservez", text: "Paiement sécurisé, commission Coliz incluse dans le prix." },
  { n: 4, title: "Suivez", text: "Messagerie et suivi jusqu'à la remise du colis." },
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

      {/* Parcours expéditeur — recherche principale.
          L'illustration (décorative, alt vide) sert de fond au titre : sa moitié
          gauche est volontairement vide pour accueillir le texte. Elle est
          affichée en entier, sans recadrage, à toutes les tailles. */}
      <section className="max-w-4xl mx-auto sm:px-4">
        <div className="relative aspect-[3/2] w-full">
          <Image
            src="/brand/hero.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 896px) 896px, 100vw"
            className="object-cover pointer-events-none select-none"
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-[46%] flex flex-col justify-center pl-4 sm:pl-8 pr-1">
            <h1 className="text-[21px] leading-[1.15] sm:text-3xl md:text-4xl font-semibold text-ink tracking-tight">
              Envoyez votre colis avec quelqu&apos;un qui fait déjà le trajet.
            </h1>
            <p className="hidden sm:block mt-3 text-ink-muted text-sm md:text-base">
              Trouvez plusieurs possibilités, comparez le prix et le délai, puis échangez avec le voyageur.
            </p>
          </div>
        </div>

        {/* Le formulaire chevauche légèrement le bas de l'image (déjà fondu dans le crème) */}
        <div className="relative z-10 px-4 sm:px-0 -mt-8 sm:-mt-14 max-w-2xl mx-auto pb-10">
          <p className="sm:hidden text-ink-muted text-base mt-4 mb-4">
            Trouvez plusieurs possibilités, comparez le prix et le délai, puis échangez avec le voyageur.
          </p>

          <Card>
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

          {/* Purement informatif (pas de lien/clic) : juste montrer la diversité
              des trajets et des modes couverts par Coliz. */}
          <div className="mt-8">
            <h2 className="text-xl sm:text-2xl font-bold text-ink">Trajets fréquents</h2>
            <p className="text-sm text-ink-muted mt-1 mb-4">
              Ces trajets sont souvent recherchés par notre communauté.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {FREQUENT_ROUTES.map(({ route, mode }) => {
                const [from, to] = route.split(" → ");
                return (
                  <span
                    key={route}
                    className="flex items-center gap-1.5 rounded-2xl bg-primary-light/70 px-2.5 py-2.5 text-[12px] sm:text-sm font-semibold text-ink leading-tight"
                  >
                    <TransportModeIcon mode={mode} size={16} className="text-primary shrink-0" />
                    <span className="min-w-0">
                      {from}
                      <br />
                      {to}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Parcours transporteur — bloc secondaire distinct (brief §4/§7) */}
      <section className="max-w-2xl mx-auto px-4 pb-14">
        <Card className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 text-center sm:text-left">
          <div className="w-12 h-12 rounded-control bg-primary-light flex items-center justify-center text-primary shrink-0">
            <SuitcaseIcon size={24} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-ink mb-1">Vous avez déjà prévu un trajet ?</p>
            <p className="text-sm text-ink-muted">
              Gagnez de l&apos;argent en transportant un colis sur votre route.
            </p>
            <p className="text-sm text-ink-muted/80 mt-1">
              Vous choisissez vos dates et vos conditions.
            </p>
          </div>
          <Link href="/trajets/nouveau" className="w-full sm:w-auto">
            <PrimaryButton className="w-full sm:w-auto px-6">Proposer un trajet</PrimaryButton>
          </Link>
        </Card>
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
        <h2 className="text-xl font-semibold text-ink text-center mb-8">Comment ça marche ?</h2>
        <div className="grid sm:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center">
              <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-semibold mx-auto mb-3">
                {s.n}
              </div>
              <p className="font-medium text-ink mb-1">{s.title}</p>
              <p className="text-sm text-ink-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center text-xs text-ink-muted/70 pb-10">
        Coliz est une marketplace mettant en relation expéditeurs et voyageurs. Coliz n&apos;est ni transporteur ni assureur.
      </footer>
    </main>
  );
}

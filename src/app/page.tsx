import Link from "next/link";
import Image from "next/image";
import { DateField } from "@/components/date-field";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { Logo } from "@/components/logo";
import { PrimaryButton, SecondaryButton, Card } from "@/components/ui";
import { ShieldIcon, LockIcon, MapPinIcon, CheckBadgeIcon, SuitcaseIcon, CarIcon, PlaneIcon, FerryIcon } from "@/components/icons";

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
  { Icon: ShieldIcon, label: "Identité vérifiée" },
  { Icon: LockIcon, label: "Paiement sécurisé" },
  { Icon: MapPinIcon, label: "Suivi du colis" },
  { Icon: CheckBadgeIcon, label: "Remise contrôlée" },
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
                <Field name="from" label="Départ" placeholder="Ville de départ" />
                <Field name="to" label="Destination" placeholder="Ville d'arrivée" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DateField name="date" label="Date de départ" placeholder="Toutes les dates" />
                <label className="block">
                  <span className="block text-sm text-ink-muted mb-1.5 whitespace-nowrap">Période flexible</span>
                  <select
                    name="flex"
                    defaultValue="3"
                    className="w-full rounded-control border border-line bg-surface px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="0">Date exacte</option>
                    <option value="3">± 3 jours</option>
                    <option value="7">± 7 jours</option>
                    <option value="15">± 15 jours</option>
                  </select>
                </label>
              </div>
              <PrimaryButton type="submit">Voir les possibilités</PrimaryButton>
            </form>
          </Card>

          {/* Purement informatif (pas de lien/clic) : juste montrer la diversité
              des trajets et des modes couverts par Coliz. */}
          <div className="mt-5">
            <p className="text-xs font-medium text-ink-muted mb-2">Trajets fréquents</p>
            <div className="grid grid-cols-3 gap-1.5">
              {FREQUENT_ROUTES.map(({ route, mode }) => (
                <span
                  key={route}
                  className="flex flex-col items-center justify-center gap-1 rounded-control bg-black/[0.03] px-1.5 py-2 text-center"
                >
                  <TransportModeIcon mode={mode} size={13} className="text-ink-muted/70 shrink-0" />
                  <span className="text-[11px] leading-tight text-ink-muted">{route}</span>
                </span>
              ))}
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
            <p className="font-semibold text-ink mb-1">Vous voyagez ?</p>
            <p className="text-sm text-ink-muted">
              Publiez votre trajet et laissez Coliz vous proposer des colis compatibles.
            </p>
          </div>
          <Link href="/trajets/nouveau" className="w-full sm:w-auto">
            <SecondaryButton className="w-full sm:w-auto px-6">Proposer un trajet</SecondaryButton>
          </Link>
        </Card>
      </section>

      {/* Réassurance — la confiance est portée par Coliz, pas par une enquête utilisateur */}
      <section className="bg-primary-light py-12">
        <div className="max-w-3xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {TRUST_ITEMS.map(({ Icon, label }) => (
            <div key={label}>
              <Icon size={26} className="text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-ink">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-14">
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

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-sm text-ink-muted mb-1.5">{label}</span>
      <input
        className="w-full rounded-control border border-line bg-surface px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
        {...props}
      />
    </label>
  );
}

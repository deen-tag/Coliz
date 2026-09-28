import Link from "next/link";
import Image from "next/image";
import { DateField } from "@/components/date-field";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { Logo } from "@/components/logo";
import { PrimaryButton, SecondaryButton, Card, TransportModeBadge } from "@/components/ui";
import { ShieldIcon, LockIcon, MapPinIcon, CheckBadgeIcon, SuitcaseIcon } from "@/components/icons";

const EXAMPLE_ROUTES: { route: string; mode: "PLANE" | "TRAIN" | "CAR" | "FERRY" }[] = [
  { route: "Nantes → Paris", mode: "TRAIN" },
  { route: "Paris → Alger", mode: "PLANE" },
  { route: "Lyon → Casablanca", mode: "PLANE" },
  { route: "Marseille → Tunis", mode: "FERRY" },
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
          L'illustration est purement décorative (alt vide) : la page se comprend
          sans elle. Bureau : en fond à droite, le texte reste dans la zone
          crème à gauche. Mobile : bandeau sous le formulaire. */}
      <section className="relative overflow-hidden">
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[68%] pointer-events-none" aria-hidden="true">
          <Image src="/brand/hero.webp" alt="" fill sizes="70vw" priority className="object-cover object-right" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-6 lg:pt-16 pb-6 lg:pb-28">
          <div className="lg:max-w-lg">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-ink leading-tight tracking-tight mb-3">
              Envoyez votre colis avec quelqu&apos;un qui fait déjà le trajet.
            </h1>
            <p className="text-ink-muted text-base sm:text-lg mb-8">
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
                    <span className="block text-sm text-ink-muted mb-1.5">Période flexible</span>
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

            <div className="flex flex-wrap gap-2 mt-4">
              {EXAMPLE_ROUTES.map(({ route, mode }) => (
                <span key={route} className="inline-flex items-center gap-1.5 rounded-control bg-black/[0.03] px-2.5 py-1.5">
                  <TransportModeBadge mode={mode} variant="plain" />
                  <span className="text-sm text-ink-muted">{route}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:hidden relative h-64 overflow-hidden pointer-events-none" aria-hidden="true">
          <Image
            src="/brand/hero.webp"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[95%_35%] scale-[1.55] origin-[95%_35%]"
          />
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

import Link from "next/link";
import { Logo } from "@/components/logo";
import { PrimaryButton, Card } from "@/components/ui";
import { PackageIcon, SuitcaseIcon, ShieldIcon, LockIcon, MapPinIcon, StarIcon } from "@/components/icons";

const EXAMPLE_ROUTES = ["Nantes → Paris", "Paris → Alger", "Lyon → Casablanca", "Marseille → Tunis"];

const TRUST_ITEMS = [
  { Icon: ShieldIcon, label: "Profils vérifiés" },
  { Icon: LockIcon, label: "Paiement sécurisé" },
  { Icon: MapPinIcon, label: "Suivi du colis" },
  { Icon: StarIcon, label: "Avis des utilisateurs" },
];

const STEPS = [
  { n: 1, title: "Publiez", text: "Décrivez votre colis ou votre trajet en quelques minutes." },
  { n: 2, title: "Trouvez", text: "Coliz vous met en relation avec la bonne personne." },
  { n: 3, title: "Réservez", text: "Paiement sécurisé, commission Coliz incluse dans le prix." },
  { n: 4, title: "Suivez", text: "Messagerie et suivi jusqu'à la remise du colis." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface-alt">
      <header className="max-w-5xl mx-auto flex items-center justify-between px-4 py-4">
        <Logo variant="primary" size={36} />
        <div className="flex gap-2">
          <Link href="/connexion" className="text-sm font-medium text-ink/70 px-3 py-2">
            Se connecter
          </Link>
          <Link href="/inscription" className="text-sm font-medium bg-primary text-white rounded-control px-4 py-2">
            Créer un compte
          </Link>
        </div>
      </header>

      <section className="max-w-2xl mx-auto px-4 pt-8 pb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-semibold text-ink leading-tight mb-3">
          Vos colis voyagent<br />avec ceux qui voyagent.
        </h1>
        <p className="text-ink/60 text-base mb-8">
          Envoyez vos colis avec des voyageurs qui font déjà le trajet. Simple, pratique et accessible.
        </p>

        <Card className="text-left">
          <form action="/recherche" className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field name="from" label="Départ" placeholder="Ville de départ" />
              <Field name="to" label="Destination" placeholder="Ville d'arrivée" />
            </div>
            <Field name="date" label="Date" type="date" />
            <PrimaryButton type="submit">Rechercher un trajet</PrimaryButton>
          </form>
        </Card>

        <p className="text-xs text-ink/40 mt-3">Exemples : {EXAMPLE_ROUTES.join(" · ")}</p>
      </section>

      <section className="max-w-2xl mx-auto px-4 grid sm:grid-cols-2 gap-3 mb-14">
        <Link href="/colis/nouveau">
          <Card className="text-center py-8 hover:shadow-md transition-shadow">
            <PackageIcon size={28} className="text-primary mx-auto mb-2" />
            <p className="font-medium text-ink">J'envoie un colis</p>
          </Card>
        </Link>
        <Link href="/trajets/nouveau">
          <Card className="text-center py-8 hover:shadow-md transition-shadow">
            <SuitcaseIcon size={28} className="text-primary mx-auto mb-2" />
            <p className="font-medium text-ink">Je propose un trajet</p>
          </Card>
        </Link>
      </section>

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
              <p className="font-medium text-ink text-sm mb-1">{s.title}</p>
              <p className="text-xs text-ink/60">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center text-xs text-ink/40 pb-10">
        Coliz est une marketplace mettant en relation expéditeurs et voyageurs. Coliz n'est ni transporteur ni assureur.
      </footer>
    </main>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-sm text-ink/70 mb-1.5">{label}</span>
      <input
        className="w-full rounded-control border border-black/10 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
        {...props}
      />
    </label>
  );
}

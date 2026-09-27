import Link from "next/link";
import { Card, SectionHeader } from "@/components/ui";
import { PackageIcon, SuitcaseIcon, CardIcon, WalletIcon, ChevronRightIcon } from "@/components/icons";

// Hub mobile uniquement : sur desktop, ces sections sont accessibles
// directement depuis la navigation globale (brief UI/UX §4 — mobile).
const SECTIONS = [
  { href: "/mes-colis", label: "Mes colis", desc: "Suivre vos envois en cours", Icon: PackageIcon },
  { href: "/mes-voyages", label: "Mes voyages", desc: "Vos trajets publiés et leurs opportunités", Icon: SuitcaseIcon },
  { href: "/reservations", label: "Réservations", desc: "Accords et transactions en cours", Icon: CardIcon },
  { href: "/portefeuille", label: "Portefeuille", desc: "Solde, paiements et retraits", Icon: WalletIcon },
];

export default function ActivitePage() {
  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      <SectionHeader title="Activité" subtitle="Tout ce qui concerne vos colis et vos trajets" />
      <div className="space-y-3">
        {SECTIONS.map(({ href, label, desc, Icon }) => (
          <Link key={href} href={href}>
            <Card className="flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-control bg-primary-light flex items-center justify-center text-primary shrink-0">
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink">{label}</p>
                <p className="text-sm text-ink-muted truncate">{desc}</p>
              </div>
              <ChevronRightIcon size={18} className="text-ink-muted shrink-0" />
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}

import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { Logo } from "@/components/logo";
import { HeroChoice } from "@/components/hero-choice";
import { CarIcon, PlaneIcon, FerryIcon, TrainIcon } from "@/components/icons";



const FREQUENT_ROUTES: { from: string; to: string; mode: "PLANE" | "CAR" | "FERRY" | "TRAIN" }[] = [
  { from: "Paris", to: "Londres", mode: "TRAIN" },
  { from: "Paris", to: "Madrid", mode: "PLANE" },
  { from: "Paris", to: "New York", mode: "PLANE" },
  { from: "Paris", to: "Marseille", mode: "CAR" },
  { from: "Marseille", to: "Alger", mode: "FERRY" },
  { from: "Paris", to: "Casablanca", mode: "PLANE" },
];

// Le voyage du colis : ce que Coliz fait réellement, dans l'ordre.
const JOURNEY: { color: string; title: string; text: string; code?: string }[] = [
  { color: "#5B7CFF", title: "Des identités vérifiées", text: "Expéditeurs et voyageurs sont vérifiés par document d'identité." },
  { color: "#5289EF", title: "Une mise en relation directe", text: "Coliz vous met en contact avec un voyageur qui fait déjà le trajet." },
  { color: "#4A96DF", title: "Un code à la remise", text: "Quand vous lui confiez le colis, vous lui donnez un code : la prise en charge est confirmée.", code: "Code de remise" },
  { color: "#41A3CE", title: "Un colis suivi", text: "Chaque étape du trajet est tracée dans l'application, jusqu'à l'arrivée." },
  { color: "#38B0BE", title: "Un code unique à la réception", text: "À la livraison, un second code est demandé pour s'assurer que le colis est remis à la bonne personne.", code: "Code de réception" },
  { color: "#2FBDAE", title: "Un paiement une fois livré", text: "Le voyageur n'est payé qu'une fois le colis livré, jamais avant." },
];

// Icônes en petit format pour la bande "Trajets fréquents" — indépendant de
// TransportModeBadge, dont les tailles/paddings sont pensés pour les cartes
// de résultats, pas pour un si petit format.
function TransportModeIcon({ mode, size, className }: { mode: "PLANE" | "CAR" | "FERRY" | "TRAIN"; size: number; className?: string }) {
  const Icon = { CAR: CarIcon, PLANE: PlaneIcon, FERRY: FerryIcon, TRAIN: TrainIcon }[mode];
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
            <Link href="/dashboard" className="text-sm font-bold bg-primary text-white rounded-[14px] px-4 py-2.5">
              Mon espace
            </Link>
          ) : (
            <>
              <Link href="/connexion" className="text-sm font-medium text-ink-muted px-3 py-2">
                Se connecter
              </Link>
              <Link href="/inscription" className="text-sm font-bold bg-primary text-white rounded-[14px] px-4 py-2.5">
                Créer un compte
              </Link>
            </>
          )}
        </div>
      </header>

      {/* HERO : l'illustration est le fond du bloc titre, sa partie neutre porte le texte. */}
      <section className="max-w-5xl mx-auto">
        <div className="relative aspect-[3/2] overflow-hidden">
          <Image src="/brand/hero.webp" alt="" fill priority sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover object-center select-none pointer-events-none" aria-hidden="true" />
          <div className="absolute inset-0 sm:hidden" style={{ background: "linear-gradient(to bottom, #F8F7F3 0, transparent 5%)" }} />
          <div className="hidden sm:block absolute inset-y-0 right-0 w-20" style={{ background: "linear-gradient(to left, #F8F7F3, transparent)" }} />
          <div className="relative z-10 px-4 pt-4 sm:px-10 sm:pt-0 sm:w-[52%] sm:h-full sm:flex sm:flex-col sm:justify-center">
            <h1 className="text-[23px] sm:text-6xl font-extrabold leading-[1.08] sm:leading-[1.02] tracking-tight text-ink max-w-[190px] sm:max-w-[11em]">
              Vos colis <span className="text-route">voyagent</span> avec ceux qui voyagent.
            </h1>
            <p className="mt-2 sm:mt-4 text-ink-muted text-[12px] leading-snug sm:leading-normal sm:text-lg max-w-[150px] sm:max-w-[21em]">
              Envoyez un colis avec un voyageur, ou gagnez de l&apos;argent sur un trajet que vous faites déjà.
            </p>
          </div>
        </div>
        <div className="relative z-10 px-5 -mt-2 sm:-mt-6 max-w-2xl mx-auto">
          <HeroChoice />
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] font-semibold text-ink-muted sm:justify-center">
            {["Identités vérifiées", "Codes de remise et de réception", "Payé une fois livré"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gradient-to-br from-sender to-traveler" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Exemples de trajets : un appui lance la recherche. */}
      <section className="max-w-2xl mx-auto px-5 pt-14">
        <h2 className="text-[28px] font-extrabold tracking-tight text-ink">Des trajets dans toute la France et le monde</h2>
        <p className="text-ink-muted mt-2 mb-5">Quelques exemples de routes. Touchez-en une pour voir les voyageurs qui la font.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FREQUENT_ROUTES.map(({ from, to, mode }) => (
            <Link key={from + to} href={`/recherche?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`} className="relative block rounded-2xl border border-line bg-surface px-3.5 py-3.5 shadow-card active:bg-sender-light">
              <span className="block min-w-0 text-[15px] font-bold leading-snug text-ink">
                <span className="flex items-center gap-2 pr-9"><i className="w-2 h-2 rounded-full bg-sender shrink-0" /><span className="truncate">{from}</span></span>
                <span className="flex items-center gap-2"><i className="w-2 h-2 rounded-full border-2 border-sender shrink-0" /><span className="truncate">{to}</span></span>
              </span>
              <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-sender-light text-sender flex items-center justify-center"><TransportModeIcon mode={mode} size={15} /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* Le voyage du colis : la ligne passe du bleu (expéditeur) au teal (voyageur). */}
      <section id="comment-ca-marche" className="mt-16 bg-ink text-white rounded-t-[32px] py-16 px-5 scroll-mt-16">
        <div className="max-w-xl mx-auto">
          <h2 className="text-[28px] font-extrabold tracking-tight">Le voyage de votre colis, étape par étape</h2>
          <p className="mt-2 text-white/70">De la rencontre à la livraison, chaque moment important est protégé.</p>
          <ol className="relative mt-9 pl-16">
            <span aria-hidden className="absolute left-[21px] top-2 bottom-2 w-[3px] rounded bg-gradient-to-b from-[#5B7CFF] to-[#2FBDAE]" />
            <span aria-hidden className="coliz-run absolute left-[14px] top-2 w-[17px] h-[17px] rounded-[5px] bg-white ring-[5px] ring-white/20" />
            {JOURNEY.map((j, i) => (
              <li key={j.title} className="relative mb-8 last:mb-0">
                <span className="absolute -left-16 -top-0.5 w-11 h-11 rounded-full flex items-center justify-center font-extrabold ring-[6px] ring-ink" style={{ backgroundColor: j.color }}>{i + 1}</span>
                <p className="text-lg font-bold leading-snug">{j.title}</p>
                <p className="text-[15px] text-white/70 mt-1 leading-relaxed">{j.text}</p>
                {j.code && (
                  <span className="inline-flex items-center gap-2 mt-3 rounded-xl border-2 border-dashed px-3 py-1.5 text-xs font-bold uppercase tracking-wider" style={{ borderColor: j.color, color: j.color }}>
                    {j.code} <span className="opacity-70 tracking-[0.25em]">••••</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 py-14 text-center">
        <h2 className="text-[28px] font-extrabold tracking-tight text-ink mb-5">Prêt à faire voyager votre colis ?</h2>
        <div className="grid sm:grid-cols-2 gap-3 max-w-lg mx-auto">
          <Link href="/colis/nouveau" className="rounded-2xl bg-sender text-white font-bold py-4">Envoyer un colis</Link>
          <Link href="/trajets/nouveau" className="rounded-2xl bg-traveler text-white font-bold py-4">Proposer un trajet</Link>
        </div>
      </section>

      <footer className="text-center text-xs text-ink-muted/70 pb-10">
        Coliz est une marketplace mettant en relation expéditeurs et voyageurs. Coliz n&apos;est ni transporteur ni assureur.
      </footer>
    </main>
  );
}

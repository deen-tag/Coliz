"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, PrimaryButton, StatusBadge } from "@/components/ui";
import { BellIcon, ChevronRightIcon, MapPinIcon, PackageIcon, SuitcaseIcon } from "@/components/icons";
import { RouteLine, formatTripDate } from "@/components/trip-parts";
import { IconField } from "@/components/form-field";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type NextAction = { key: string; text: string; href: string; cta: string };

// Ce qui demande une action de votre part, par ordre d'urgence — le reste
// de l'écran n'est que du contexte.
function computeActions(bookings: any[] | undefined): NextAction[] {
  if (!Array.isArray(bookings)) return [];
  const actions: NextAction[] = [];
  const add = (b: any, text: string, href: string, cta: string) =>
    actions.push({ key: `${b.id}-${b.status}`, text, href, cta });

  for (const b of bookings) {
    if (b.role === "traveler" && b.status === "REQUESTED")
      add(b, `${b.counterpart} demande à envoyer un colis avec vous`, `/reservations/${b.id}`, "Répondre");
    else if (b.role === "sender" && (b.status === "ACCEPTED" || b.status === "PAYMENT_PENDING"))
      add(b, `${b.counterpart} a accepté : payez pour confirmer`, `/reservations/${b.id}`, "Payer");
    else if (b.role === "traveler" && b.status === "PICKED_UP")
      add(b, `À l'arrivée, saisissez le code de réception`, `/suivi/${b.id}`, "Saisir le code");
    else if (b.role === "traveler" && b.status === "CONFIRMED")
      add(b, `Récupérez le colis auprès de ${b.counterpart} et saisissez son code`, `/suivi/${b.id}`, "Saisir le code");
    else if (b.role === "sender" && b.status === "CONFIRMED")
      add(b, `Remettez le colis à ${b.counterpart} avec votre code de remise`, `/suivi/${b.id}`, "Voir mon code");
  }
  return actions.slice(0, 3);
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data } = useSWR("/api/dashboard", fetcher);
  const { data: bookings } = useSWR("/api/bookings", fetcher);
  const [q, setQ] = useState({ from: "", to: "" });

  const actions = computeActions(bookings);
  const firstName = (session?.user?.name ?? "").split(" ")[0];

  function search(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.from.trim()) p.set("from", q.from.trim());
    if (q.to.trim()) p.set("to", q.to.trim());
    router.push(`/recherche?${p.toString()}`);
  }

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-ink">{firstName ? `Bonjour ${firstName}` : "Bonjour"}</h1>
        <Link href="/notifications" className="relative text-ink-muted p-1" aria-label="Notifications">
          <BellIcon size={24} />
          {data?.unreadNotifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
              {data.unreadNotifications}
            </span>
          )}
        </Link>
      </div>

      {actions.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-semibold text-ink mb-3">À faire maintenant</h2>
          <div className="space-y-2">
            {actions.map((a) => (
              <Link key={a.key} href={a.href} className="block">
                <Card className="flex items-center gap-3 !p-4 border-primary/30 bg-primary-light">
                  <p className="flex-1 text-sm text-ink leading-snug">{a.text}</p>
                  <span className="rounded-control bg-primary text-white text-sm font-medium px-3.5 py-2 whitespace-nowrap">
                    {a.cta}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link href="/colis/nouveau" className="block rounded-card bg-primary-light p-4 active:opacity-90">
          <span className="w-10 h-10 rounded-full bg-surface text-primary flex items-center justify-center mb-3">
            <PackageIcon size={20} />
          </span>
          <p className="font-semibold text-ink leading-tight">Envoyer un colis</p>
          <p className="text-xs text-ink-muted mt-1 leading-snug">Trouvez un voyageur qui fait déjà le trajet.</p>
        </Link>
        <Link href="/trajets/nouveau" className="block rounded-card bg-primary-light p-4 active:opacity-90">
          <span className="w-10 h-10 rounded-full bg-surface text-primary flex items-center justify-center mb-3">
            <SuitcaseIcon size={20} />
          </span>
          <p className="font-semibold text-ink leading-tight">Proposer un trajet</p>
          <p className="text-xs text-ink-muted mt-1 leading-snug">Gagnez de l&apos;argent en transportant un colis.</p>
        </Link>
      </div>

      {/* Recherche : directement sur le fond, pas dans une carte de plus */}
      <form onSubmit={search} className="mb-10 space-y-3">
        <h2 className="text-base font-semibold text-ink">Chercher un trajet</h2>
        <div className="grid grid-cols-2 gap-3">
          <IconField icon={<MapPinIcon size={18} />} placeholder="Départ" value={q.from} onChange={(e) => setQ({ ...q, from: e.target.value })} />
          <IconField icon={<MapPinIcon size={18} />} placeholder="Destination" value={q.to} onChange={(e) => setQ({ ...q, to: e.target.value })} />
        </div>
        <PrimaryButton type="submit">Voir les trajets disponibles</PrimaryButton>
      </form>

      <Section title="Mes colis" href="/mes-colis">
        {data?.activeParcels?.length ? (
          <Card className="!p-0 divide-y divide-line overflow-hidden">
            {data.activeParcels.slice(0, 3).map((p: any) => (
              <Link key={p.id} href="/mes-colis" className="block p-4 active:bg-surface-alt">
                <div className="flex items-start justify-between gap-3">
                  <RouteLine from={p.originLabel} to={p.destinationLabel} className="flex-1" />
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-sm text-ink-muted mt-1.5">{formatTripDate(p.desiredDate)}</p>
              </Link>
            ))}
          </Card>
        ) : (
          <EmptyState text="Aucun colis en cours." />
        )}
      </Section>

      <Section title="Mes voyages" href="/mes-voyages">
        {data?.activeTrips?.length ? (
          <Card className="!p-0 divide-y divide-line overflow-hidden">
            {data.activeTrips.slice(0, 3).map((t: any) => (
              <Link key={t.id} href={`/trajets/${t.id}`} className="block p-4 active:bg-surface-alt">
                <div className="flex items-start justify-between gap-3">
                  <RouteLine from={t.originLabel} to={t.destinationLabel} className="flex-1" />
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-sm text-ink-muted mt-1.5">{formatTripDate(t.departureAt)}</p>
              </Link>
            ))}
          </Card>
        ) : (
          <EmptyState text="Aucun trajet publié." />
        )}
      </Section>
    </main>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <Link href={href} className="text-sm text-primary font-medium flex items-center gap-0.5">
          Voir tout <ChevronRightIcon size={14} />
        </Link>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-ink-muted py-4 text-center">{text}</p>;
}

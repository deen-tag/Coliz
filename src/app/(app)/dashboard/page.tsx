"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, PrimaryButton, SecondaryButton, StatusBadge } from "@/components/ui";
import { BellIcon, ChevronRightIcon, MapPinIcon } from "@/components/icons";
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
        <h1 className="text-xl font-semibold text-ink">{firstName ? `Bonjour ${firstName}` : "Bonjour"}</h1>
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
          <h2 className="text-sm font-medium text-ink mb-3">À faire maintenant</h2>
          <div className="space-y-2">
            {actions.map((a) => (
              <Link key={a.key} href={a.href} className="block">
                <Card className="flex items-center gap-3 border-primary/30 bg-primary-light">
                  <p className="flex-1 text-sm text-ink">{a.text}</p>
                  <span className="text-sm font-medium text-primary whitespace-nowrap">{a.cta}</span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Card as="form" onSubmit={search} className="mb-6 space-y-3">
        <p className="text-sm font-medium text-ink">Trouver un trajet</p>
        <div className="grid grid-cols-2 gap-3">
          <IconField icon={<MapPinIcon size={18} />} placeholder="Départ" value={q.from} onChange={(e) => setQ({ ...q, from: e.target.value })} />
          <IconField icon={<MapPinIcon size={18} />} placeholder="Destination" value={q.to} onChange={(e) => setQ({ ...q, to: e.target.value })} />
        </div>
        <PrimaryButton type="submit">Rechercher</PrimaryButton>
      </Card>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link href="/colis/nouveau">
          <SecondaryButton>Envoyer un colis</SecondaryButton>
        </Link>
        <Link href="/trajets/nouveau">
          <SecondaryButton>Proposer un trajet</SecondaryButton>
        </Link>
      </div>

      <Section title="Mes colis" href="/mes-colis">
        {data?.activeParcels?.length ? (
          data.activeParcels.slice(0, 3).map((p: any) => (
            <Link key={p.id} href="/mes-colis" className="block mb-3">
              <Card className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{p.originLabel} → {p.destinationLabel}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{new Date(p.desiredDate).toLocaleDateString("fr-FR")}</p>
                </div>
                <StatusBadge status={p.status} />
              </Card>
            </Link>
          ))
        ) : (
          <EmptyState text="Aucun colis en cours." />
        )}
      </Section>

      <Section title="Mes voyages" href="/mes-voyages">
        {data?.activeTrips?.length ? (
          data.activeTrips.slice(0, 3).map((t: any) => (
            <Link key={t.id} href={`/trajets/${t.id}`} className="block mb-3">
              <Card className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{t.originLabel} → {t.destinationLabel}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{new Date(t.departureAt).toLocaleDateString("fr-FR")}</p>
                </div>
                <StatusBadge status={t.status} />
              </Card>
            </Link>
          ))
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
        <h2 className="text-sm font-medium text-ink">{title}</h2>
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

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { Card, VerifiedBadge, TransportModeBadge, LoadingState } from "@/components/ui";
import { ChevronRightIcon, StarIcon, CheckBadgeIcon } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { RouteLine, formatPrice, formatTripMoment } from "@/components/trip-parts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ProfilVoyageurPage() {
  const { id } = useParams<{ id: string }>();
  const { data: profile } = useSWR(`/api/users/${id}`, fetcher);

  if (!profile) return <LoadingState />;
  if (profile.error) {
    return (
      <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto text-center">
        <p className="text-sm text-ink-muted py-10">Ce profil n&apos;existe plus.</p>
      </main>
    );
  }

  const memberSince = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
    : null;
  const hasRating = profile.ratingCount > 0;
  const verification = profile.verification ?? {};

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      {/* Qui est cette personne : le cœur de la confiance */}
      <Card className="text-center mb-4">
        <Avatar name={profile.firstName} src={profile.avatarUrl} size={88} className="mx-auto mb-3" />
        <h1 className="text-xl font-extrabold tracking-tight text-ink">{profile.firstName}</h1>
        {hasRating ? (
          <p className="text-sm text-ink-muted mt-1 flex items-center justify-center gap-1">
            <StarIcon size={15} className="text-primary" />
            {Number(profile.ratingAverage).toFixed(1)} ({profile.ratingCount} avis)
          </p>
        ) : (
          <p className="text-sm text-ink-muted mt-1">Nouveau sur Coliz</p>
        )}
        <div className="mt-3 flex justify-center">
          <VerifiedBadge identity={verification.identity} email={verification.email} />
        </div>

        <dl className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-line">
          <Stat label="Membre depuis" value={memberSince ?? "—"} />
          <Stat label={profile.completedTrips > 1 ? "Trajets réalisés" : "Trajet réalisé"} value={String(profile.completedTrips ?? 0)} />
          <Stat label="Avis" value={String(profile.ratingCount ?? 0)} />
        </dl>
      </Card>

      {/* Ce qui est réellement vérifié */}
      <Card className="mb-4">
        <p className="font-semibold text-ink mb-3">Vérifications</p>
        <ul className="space-y-2.5 text-sm">
          <CheckRow ok={Boolean(verification.identity)} label="Identité vérifiée" />
          <CheckRow ok={Boolean(verification.email)} label="Email vérifié" />
          {verification.phone && <CheckRow ok label="Téléphone vérifié" />}
        </ul>
      </Card>

      {profile.bio && (
        <Card className="mb-4">
          <p className="font-semibold text-ink mb-2">À propos</p>
          <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-line">{profile.bio}</p>
        </Card>
      )}

      {/* Prolongement naturel du parcours : retrouver ses trajets */}
      {profile.upcomingTrips?.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold text-ink mb-3">Prochains trajets de {profile.firstName}</h2>
          <div className="space-y-3">
            {profile.upcomingTrips.map((t: any) => (
              <Link key={t.id} href={`/trajets/${t.id}`} className="block">
                <Card className="!p-4">
                  <RouteLine from={t.originLabel} to={t.destinationLabel} className="mb-1.5" />
                  <p className="text-sm text-ink-muted">{formatTripMoment(t.departureAt)}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                    <TransportModeBadge mode={t.mode} />
                    <span className="flex items-center gap-1 font-semibold text-ink">
                      {formatPrice(t.totalAmount)}
                      <ChevronRightIcon size={16} className="text-primary" />
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold text-ink mb-3">Avis reçus{profile.reviews.length > 0 ? ` (${profile.reviews.length})` : ""}</h2>
        <div className="space-y-3">
          {profile.reviews.length ? (
            profile.reviews.map((r: any, i: number) => (
              <Card key={i} className="!p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar name={r.author} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{r.author}</p>
                    {r.createdAt && (
                      <p className="text-xs text-ink-muted">
                        {new Date(r.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <span className="text-sm tracking-wide" aria-label={`${r.rating} sur 5`}>
                    <span className="text-primary">{"★".repeat(r.rating)}</span>
                    <span className="text-line">{"★".repeat(Math.max(0, 5 - r.rating))}</span>
                  </span>
                </div>
                {r.comment && <p className="text-sm text-ink-muted leading-relaxed">{r.comment}</p>}
              </Card>
            ))
          ) : (
            <Card className="text-center !py-8">
              <p className="text-sm text-ink-muted">
                {hasRating ? "Aucun commentaire écrit pour le moment." : "Pas encore d'avis : c'est un nouveau voyageur."}
              </p>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="font-semibold text-ink capitalize">{value}</dd>
      <dt className="text-xs text-ink-muted mt-0.5 leading-tight">{label}</dt>
    </div>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <CheckBadgeIcon size={18} className={ok ? "text-success" : "text-line"} />
      <span className={ok ? "text-ink" : "text-ink-muted"}>{ok ? label : label.replace(" vérifié", " non vérifié").replace("vérifiée", "non vérifiée")}</span>
    </li>
  );
}

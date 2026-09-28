"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { Card, VerifiedBadge } from "@/components/ui";
import { StarIcon } from "@/components/icons";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ProfilVoyageurPage() {
  const { id } = useParams<{ id: string }>();
  const { data: profile } = useSWR(`/api/users/${id}`, fetcher);

  if (!profile) return null;

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-primary text-2xl font-medium mb-3">
          {profile.firstName?.[0]}
        </div>
        <h1 className="text-lg font-semibold text-ink">{profile.firstName}</h1>
        <p className="text-sm text-ink-muted mb-2 flex items-center justify-center gap-1">
          <StarIcon size={15} className="text-primary" /> {profile.ratingAverage.toFixed(1)} ({profile.ratingCount} avis)
        </p>
        <VerifiedBadge identity={profile.verification.identity} email={profile.verification.email} />
        {profile.bio && <p className="text-sm text-ink-muted mt-4">{profile.bio}</p>}
      </div>

      <h2 className="text-sm font-medium text-ink-muted mb-3">Avis reçus</h2>
      <div className="space-y-3">
        {profile.reviews.length ? (
          profile.reviews.map((r: any, i: number) => (
            <Card key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-ink">{r.author}</span>
                <span className="text-sm text-primary">{"★".repeat(r.rating)}</span>
              </div>
              {r.comment && <p className="text-sm text-ink-muted">{r.comment}</p>}
            </Card>
          ))
        ) : (
          <p className="text-sm text-ink-muted text-center py-6">Pas encore d'avis.</p>
        )}
      </div>
    </main>
  );
}

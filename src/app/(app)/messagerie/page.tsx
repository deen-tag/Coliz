"use client";

import useSWR from "swr";
import Link from "next/link";
import { Card, SectionHeader, EmptyState, StatusBadge } from "@/components/ui";
import { Avatar } from "@/components/avatar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Heure du dernier message : l'heure aujourd'hui, « Hier », sinon la date courte.
function formatMessageTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days <= 0) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", d.getFullYear() === now.getFullYear() ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}

export default function MessagerieIndexPage() {
  const { data: conversations } = useSWR("/api/messages/conversations", fetcher);

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      <SectionHeader title="Messages" />

      {conversations?.length === 0 && (
        <EmptyState
          title="Aucune conversation pour le moment"
          description="Une conversation s'ouvre dès qu'une demande de réservation est envoyée."
        />
      )}

      <div className="space-y-3">
        {conversations?.map((c: any) => (
          <Link key={c.bookingId} href={`/messagerie/${c.bookingId}`} className="block">
            <Card className="flex items-center gap-3">
              <Avatar name={c.otherUser?.firstName} src={c.otherUser?.avatarUrl} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold text-ink truncate">{c.otherUser?.firstName}</p>
                  {c.lastMessageAt && <span className="text-xs text-ink-muted shrink-0">{formatMessageTime(c.lastMessageAt)}</span>}
                </div>
                {c.route && c.lastMessage && (
                  <p className="text-xs font-medium text-primary truncate">{String(c.route).split(" → ").map((x: string) => x.split(",")[0].trim()).join(" → ")}</p>
                )}
                <p className="text-sm text-ink-muted truncate">{c.lastMessage ?? String(c.route ?? "").split(" → ").map((x: string) => x.split(",")[0].trim()).join(" → ")}</p>
                {c.status && (
                  <div className="mt-1.5">
                    <StatusBadge status={c.status} />
                  </div>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}

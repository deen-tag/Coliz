"use client";

import useSWR from "swr";
import Link from "next/link";
import { Card, SectionHeader, EmptyState } from "@/components/ui";
import { Avatar } from "@/components/avatar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
                <p className="font-semibold text-ink">{c.otherUser?.firstName}</p>
                {c.route && c.lastMessage && (
                  <p className="text-xs font-medium text-primary truncate">{String(c.route).split(" → ").map((x: string) => x.split(",")[0].trim()).join(" → ")}</p>
                )}
                <p className="text-sm text-ink-muted truncate">{c.lastMessage ?? String(c.route ?? "").split(" → ").map((x: string) => x.split(",")[0].trim()).join(" → ")}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}

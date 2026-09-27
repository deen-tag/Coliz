"use client";

import useSWR from "swr";
import Link from "next/link";
import { Card, SectionHeader, EmptyState } from "@/components/ui";

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
          <Link key={c.bookingId} href={`/messagerie/${c.bookingId}`}>
            <Card className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-medium">
                {c.otherUser?.firstName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink">{c.otherUser?.firstName}</p>
                <p className="text-xs text-ink-muted truncate">{c.lastMessage ?? c.route}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}

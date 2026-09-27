"use client";

import useSWR from "swr";
import Link from "next/link";
import { Card } from "@/components/ui";
import { ScreenHeader } from "@/components/screen-header";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MessagerieIndexPage() {
  const { data: conversations } = useSWR("/api/messages/conversations", fetcher);

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto">
      <ScreenHeader title="Messages" />

      <div className="space-y-3">
        {conversations?.length ? (
          conversations.map((c: any) => (
            <Link key={c.bookingId} href={`/messagerie/${c.bookingId}`}>
              <Card className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-medium">
                  {c.otherUser?.firstName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">{c.otherUser?.firstName}</p>
                  <p className="text-xs text-ink/50 truncate">{c.lastMessage ?? c.route}</p>
                </div>
              </Card>
            </Link>
          ))
        ) : (
          <p className="text-sm text-ink/40 text-center py-10">Aucune conversation pour le moment.</p>
        )}
      </div>

    </main>
  );
}

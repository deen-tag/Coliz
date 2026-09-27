"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { ChevronRightIcon } from "@/components/icons";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ConversationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { data: session } = useSession();
  const { data: booking } = useSWR(`/api/bookings/${bookingId}`, fetcher);
  const { data: messages, mutate } = useSWR(`/api/messages?bookingId=${bookingId}`, fetcher, {
    refreshInterval: 4000,
  });
  const [text, setText] = useState("");

  const myId = (session?.user as any)?.id;
  const otherUser = booking && (booking.senderId === myId ? booking.traveler : booking.sender);

  async function send() {
    if (!text.trim()) return;
    setText("");
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, content: text }),
    });
    mutate();
  }

  return (
    <main className="min-h-screen bg-surface-alt flex flex-col max-w-md mx-auto md:max-w-2xl">
      <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-line">
        <Link href="/messagerie" className="text-ink-muted">
          <ChevronRightIcon size={20} className="rotate-180" />
        </Link>
        <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary text-xs font-medium">
          {otherUser?.firstName?.[0]}
        </div>
        <p className="text-sm font-medium text-ink">{otherUser?.firstName ?? "..."}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {messages?.map((m: any) => {
          const mine = m.authorId === myId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine ? "bg-primary text-white" : "bg-surface border border-line text-ink"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-surface border-t border-line flex gap-2 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Écrire un message..."
          className="flex-1 rounded-control border border-line px-4 py-2.5 text-[15px]"
        />
        <button onClick={send} className="rounded-control bg-primary text-white px-4 font-medium text-sm">
          Envoyer
        </button>
      </div>
    </main>
  );
}

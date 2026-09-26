"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ConversationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { data: session } = useSession();
  const { data: messages, mutate } = useSWR(`/api/messages?bookingId=${bookingId}`, fetcher, {
    refreshInterval: 4000,
  });
  const [text, setText] = useState("");

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

  const myId = (session?.user as any)?.id;

  return (
    <main className="min-h-screen bg-surface-alt flex flex-col max-w-md mx-auto">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {messages?.map((m: any) => {
          const mine = m.authorId === myId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine ? "bg-primary text-white" : "bg-surface border border-black/5 text-ink"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-surface border-t border-black/5 flex gap-2 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Écrire un message..."
          className="flex-1 rounded-control border border-black/10 px-4 py-2.5 text-[15px]"
        />
        <button onClick={send} className="rounded-control bg-primary text-white px-4 font-medium text-sm">
          Envoyer
        </button>
      </div>
    </main>
  );
}

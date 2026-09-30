"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { ChevronRightIcon } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { StatusBadge } from "@/components/ui";
import { RouteLine, formatTripMoment } from "@/components/trip-parts";
import { bookingHref } from "@/lib/booking-status";
import { useRoleOverride } from "@/components/role-scope";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ConversationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { data: session } = useSession();
  const { data: booking } = useSWR(`/api/bookings/${bookingId}`, fetcher);
  const { data: messages, mutate } = useSWR(`/api/messages?bookingId=${bookingId}`, fetcher, {
    refreshInterval: 4000,
  });
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Toujours afficher le dernier message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [Array.isArray(messages) ? messages.length : 0]);

  const myId = (session?.user as any)?.id;
  const otherUser = booking && (booking.senderId === myId ? booking.traveler : booking.sender);
  useRoleOverride(booking && !booking.error ? (booking.senderId === myId ? "sender" : booking.travelerId === myId ? "traveler" : null) : null);

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
    // Hauteur = écran moins ce qui l'entoure (barre du bas sur mobile, en-tête sur ordinateur) :
    // le champ de saisie est ainsi toujours visible, sans avoir à faire défiler la page.
    <main className="h-[calc(100dvh-5rem-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-4rem)] bg-surface-alt flex flex-col max-w-md mx-auto md:max-w-2xl">
      <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-line">
        <Link href="/messagerie" className="text-ink-muted">
          <ChevronRightIcon size={20} className="rotate-180" />
        </Link>
        <Avatar name={otherUser?.firstName} src={otherUser?.avatarUrl} size={36} />
        <p className="text-sm font-semibold text-ink">{otherUser?.firstName ?? "..."}</p>
      </div>

      {/* De quel envoi parle-t-on : le contexte reste visible pendant toute la conversation */}
      {booking && !booking.error && (
        <Link href={bookingHref(booking)} className="block bg-surface border-b border-line px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <RouteLine from={booking.trip.originLabel} to={booking.trip.destinationLabel} className="text-sm" />
              <p className="text-xs text-ink-muted mt-1">
                {formatTripMoment(booking.trip.departureAt)}
                {" · "}
                {booking.parcel.weightKg} kg
              </p>
            </div>
            <StatusBadge status={booking.status} />
            <ChevronRightIcon size={16} className="text-ink-muted shrink-0" />
          </div>
        </Link>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-3">
        {Array.isArray(messages) && messages.length === 0 && (
          <p className="text-sm text-ink-muted text-center py-10">
            Aucun message pour le moment. Dites bonjour à {otherUser?.firstName ?? "votre interlocuteur"} pour organiser la remise du colis.
          </p>
        )}
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
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 p-3 bg-surface border-t border-line flex gap-2">
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

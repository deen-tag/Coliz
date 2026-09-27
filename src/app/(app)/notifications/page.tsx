"use client";

import useSWR, { mutate } from "swr";
import { SectionHeader, EmptyState } from "@/components/ui";
import {
  PackageIcon,
  MessageIcon,
  CardIcon,
  MapPinIcon,
  ShieldIcon,
  BellIcon,
} from "@/components/icons";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TYPE_ICON: Record<string, (p: { size?: number; className?: string }) => JSX.Element> = {
  new_match: PackageIcon,
  booking_requested: PackageIcon,
  booking_accepted: PackageIcon,
  booking_refused: PackageIcon,
  payment_confirmed: CardIcon,
  parcel_picked_up: MapPinIcon,
  trip_departed: MapPinIcon,
  trip_arrived: MapPinIcon,
  delivery_confirmed: MapPinIcon,
  new_message: MessageIcon,
  incident_action_required: ShieldIcon,
};

// Ni compteur agressif, ni relance systématique : un point discret pour le
// non-lu, marqué lu au toucher (brief UI/UX §23).
export default function NotificationsPage() {
  const { data: notifications, isLoading } = useSWR("/api/notifications", fetcher);

  async function markRead(id: string) {
    mutate(
      "/api/notifications",
      notifications?.map((n: any) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)),
      false
    );
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      <SectionHeader title="Notifications" />

      {isLoading && <p className="text-sm text-ink-muted text-center py-10">Chargement...</p>}

      {notifications?.length === 0 && (
        <EmptyState
          title="Rien de nouveau"
          description="Vous serez prévenu ici dès qu'un colis, un trajet ou un message évolue."
        />
      )}

      <div className="divide-y divide-line">
        {notifications?.map((n: any) => {
          const Icon = TYPE_ICON[n.type] ?? BellIcon;
          const unread = !n.readAt;
          return (
            <button
              key={n.id}
              onClick={() => unread && markRead(n.id)}
              className="w-full flex items-start gap-3 py-4 text-left"
            >
              <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-primary shrink-0">
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${unread ? "font-medium text-ink" : "text-ink-muted"}`}>{n.content}</p>
                <p className="text-xs text-ink-muted/70 mt-0.5">{timeAgo(n.createdAt)}</p>
              </div>
              {unread && <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
            </button>
          );
        })}
      </div>
    </main>
  );
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "À l'instant";
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

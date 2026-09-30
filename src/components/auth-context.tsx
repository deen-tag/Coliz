"use client";

import useSWR from "swr";
import { Card } from "@/components/ui";
import { RouteLine, formatPrice, formatTripMoment } from "@/components/trip-parts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Sur connexion / inscription : si l'on vient d'un trajet, on le rappelle
// pour que l'utilisateur sache pourquoi on lui demande un compte et où il revient.
export function tripIdFromCallback(callbackUrl: string | null): string | null {
  return callbackUrl?.match(/^\/trajets\/([^/?#]+)/)?.[1] ?? null;
}

export function AuthTripContext({ tripId, label = "Le trajet que vous avez choisi" }: { tripId: string; label?: string }) {
  const { data: trip } = useSWR(`/api/trips/${tripId}`, fetcher);
  if (!trip || trip.error) return null;

  return (
    <Card className="mb-5 !p-4">
      <p className="text-xs font-medium text-ink-muted mb-2.5">{label}</p>
      <RouteLine from={trip.originLabel} to={trip.destinationLabel} className="text-[15px]" />
      <div className="flex items-center justify-between mt-2.5 text-sm">
        <span className="text-ink-muted">{formatTripMoment(trip.departureAt)}</span>
        <span className="font-semibold text-ink">{formatPrice(trip.totalAmount ?? trip.contributionAmount)}</span>
      </div>
    </Card>
  );
}

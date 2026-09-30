import Link from "next/link";
import { Card, StatusBadge, TransportModeBadge } from "@/components/ui";
import { ChevronRightIcon } from "@/components/icons";
import { RouteLine, formatPrice, formatTripMoment } from "@/components/trip-parts";
import { bookingHref, bookingStatusInfo } from "@/lib/booking-status";

// Une réservation dans une liste : trajet, date, avec qui, prix, et ce qu'on attend de moi.
// Les données viennent de /api/bookings (rôle et interlocuteur déjà résolus).
export function BookingRow({ b }: { b: any }) {
  const role = b.role === "sender" ? "sender" : "traveler";
  const info = bookingStatusInfo(b.status, role, b.counterpart);
  return (
    <Link href={bookingHref(b)} className="block">
      <Card className="!p-4 active:bg-surface-alt transition-colors">
        <div className="flex items-start justify-between gap-3 mb-3">
          <RouteLine from={b.originLabel} to={b.destinationLabel} className="flex-1" />
          <StatusBadge status={b.status} />
        </div>
        <p className="text-sm text-ink-muted">
          {formatTripMoment(b.departureAt)}
          {" · "}
          {role === "sender" ? `avec ${b.counterpart}` : `pour ${b.counterpart}`}
        </p>
        <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-line">
          <div className="flex items-center gap-2 min-w-0">
            <TransportModeBadge mode={b.mode} />
            <span className="font-semibold text-ink">{formatPrice(b.totalAmount)}</span>
          </div>
          <span
            className={`flex items-center gap-0.5 text-xs font-medium text-right ${info.actionNeeded ? "text-primary" : "text-ink-muted"}`}
          >
            {info.actionNeeded ? "À faire : " : ""}
            {info.title}
            <ChevronRightIcon size={14} className="shrink-0" />
          </span>
        </div>
      </Card>
    </Link>
  );
}

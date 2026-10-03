import React, { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge, Button, Card, EmptyState, ErrorState, H1, SectionTitle, Segmented, SkeletonList } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { colors } from "@/lib/theme";
import { bookingStatusInfo, isPastBooking } from "@/lib/booking-status";
import { dateShort, eur, modeInfo, shortCity } from "@/lib/format";
import type { BookingListItem, MyParcel, MyTrip } from "@/lib/types";
import type { IconName } from "@/components/ui";

type Tab = "bookings" | "parcels" | "trips";

const PARCEL_LABELS: Record<string, { label: string; tone: "neutral" | "info" | "success" | "warning" | "error" }> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  SEARCHING: { label: "En recherche", tone: "info" },
  MATCHED: { label: "Trajet trouvé", tone: "info" },
  BOOKED: { label: "Réservé", tone: "info" },
  PAID: { label: "Payé", tone: "success" },
  PICKED_UP: { label: "Pris en charge", tone: "info" },
  IN_TRANSIT: { label: "En transit", tone: "info" },
  ARRIVED: { label: "Arrivé", tone: "success" },
  DELIVERED: { label: "Livré", tone: "success" },
  CLOSED: { label: "Terminé", tone: "neutral" },
  CANCELLED: { label: "Annulé", tone: "error" },
};
const TRIP_LABELS: Record<string, { label: string; tone: "neutral" | "info" | "success" | "warning" | "error" }> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PUBLISHED: { label: "Publié", tone: "success" },
  PARTIALLY_BOOKED: { label: "Partiellement réservé", tone: "info" },
  FULLY_BOOKED: { label: "Complet", tone: "warning" },
  IN_PROGRESS: { label: "En cours", tone: "info" },
  COMPLETED: { label: "Terminé", tone: "neutral" },
  ARCHIVED: { label: "Archivé", tone: "neutral" },
  CANCELLED: { label: "Annulé", tone: "error" },
};

export default function Activity() {
  return (
    <RequireAuth title="Votre activité" text="Connectez-vous pour suivre vos réservations, vos colis et vos trajets." icon="cube-outline">
      <ActivityInner />
    </RequireAuth>
  );
}

function ActivityInner() {
  const [tab, setTab] = useState<Tab>("bookings");
  const bookings = useApi<BookingListItem[]>("/api/bookings");
  const parcels = useApi<MyParcel[]>("/api/parcels");
  const trips = useApi<MyTrip[]>("/api/trips");
  const current = tab === "bookings" ? bookings : tab === "parcels" ? parcels : trips;

  return (
    <Screen topInset refreshing={current.refreshing} onRefresh={current.refresh}>
      <H1 style={{ marginBottom: 14 }}>Activité</H1>
      <Segmented
        options={[{ key: "bookings", label: "Réservations" }, { key: "parcels", label: "Mes colis" }, { key: "trips", label: "Mes trajets" }]}
        value={tab}
        onChange={setTab}
      />
      {current.loading ? (
        <SkeletonList />
      ) : current.error && !current.data ? (
        <ErrorState message={current.error.message} network={current.error.isNetwork} onRetry={current.reload} />
      ) : tab === "bookings" ? (
        <Bookings items={bookings.data ?? []} />
      ) : tab === "parcels" ? (
        <Parcels items={parcels.data ?? []} />
      ) : (
        <Trips items={trips.data ?? []} />
      )}
    </Screen>
  );
}

function Bookings({ items }: { items: BookingListItem[] }) {
  const upcoming = items.filter((b) => !isPastBooking(b.status));
  const past = items.filter((b) => isPastBooking(b.status));
  if (items.length === 0)
    return <View style={{ minHeight: 360 }}><EmptyState icon="swap-horizontal-outline" title="Aucune réservation" text="Vos demandes et vos envois en cours apparaîtront ici." action={{ label: "Rechercher un trajet", onPress: () => router.push("/(tabs)/search") }} /></View>;
  const render = (b: BookingListItem) => {
    const info = bookingStatusInfo(b.status, b.role, b.counterpart);
    const mode = modeInfo(b.mode);
    return (
      <Card key={b.id} onPress={() => router.push(`/booking/${b.id}`)}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ fontWeight: "700", fontSize: 16, color: colors.ink }}>{shortCity(b.originLabel)} → {shortCity(b.destinationLabel)}</Text>
            <Text style={{ color: colors.muted, marginTop: 3 }}>{dateShort(b.departureAt)} · avec {b.counterpart}</Text>
          </View>
          <Text style={{ fontWeight: "800", color: colors.primary }}>{eur(b.role === "sender" ? b.totalAmount : b.contributionAmount)}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <Badge label={info.title} tone={info.tone === "neutral" ? "neutral" : info.tone} />
          <Badge label={b.role === "sender" ? "Expéditeur" : "Voyageur"} tone={b.role === "sender" ? "info" : "traveler"} />
          <Badge label={mode.label} tone="neutral" icon={mode.icon as IconName} />
          {info.actionNeeded ? <Badge label="À vous de jouer" tone="warning" icon="flash" /> : null}
        </View>
      </Card>
    );
  };
  return (
    <>
      {upcoming.length > 0 ? <><SectionTitle title="À venir" />{upcoming.map(render)}</> : null}
      {past.length > 0 ? <><SectionTitle title="Historique" />{past.map(render)}</> : null}
    </>
  );
}

function Parcels({ items }: { items: MyParcel[] }) {
  return (
    <>
      <Button title="Envoyer un nouveau colis" icon="add" onPress={() => router.push("/parcel/new")} style={{ marginBottom: 14 }} />
      {items.length === 0 ? (
        <EmptyState icon="cube-outline" title="Aucun colis" text="Décrivez votre colis : nous vous proposons les voyageurs compatibles." />
      ) : (
        items.map((p) => {
          const st = PARCEL_LABELS[p.status] ?? { label: p.status, tone: "neutral" as const };
          return (
            <Card key={p.id} onPress={() => (p.booking && p.booking.status !== "CANCELLED" ? router.push(`/booking/${p.booking.id}`) : router.push(`/parcel/${p.id}`))}>
              <Text style={{ fontWeight: "700", fontSize: 16, color: colors.ink }}>{shortCity(p.originLabel)} → {shortCity(p.destinationLabel)}</Text>
              <Text style={{ color: colors.muted, marginTop: 3 }}>Souhaité le {dateShort(p.desiredDate)}</Text>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 10, alignItems: "center" }}>
                <Badge label={st.label} tone={st.tone} />
                {p.booking && p.booking.status !== "CANCELLED" ? <Text style={{ color: colors.muted }}>avec {p.booking.travelerFirstName} · {eur(p.booking.totalAmount)}</Text> : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}><Text style={{ color: colors.primary, fontWeight: "600" }}>Voir les trajets</Text><Ionicons name="chevron-forward" size={14} color={colors.primary} /></View>
                )}
              </View>
            </Card>
          );
        })
      )}
    </>
  );
}

function Trips({ items }: { items: MyTrip[] }) {
  return (
    <>
      <Button title="Proposer un trajet" variant="traveler" icon="add" onPress={() => router.push("/trip/new")} style={{ marginBottom: 14 }} />
      {items.length === 0 ? (
        <EmptyState icon="airplane-outline" title="Aucun trajet" text="Vous voyagez bientôt ? Rentabilisez votre place en transportant un colis." />
      ) : (
        items.map((t) => {
          const st = TRIP_LABELS[t.status] ?? { label: t.status, tone: "neutral" as const };
          return (
            <Card key={t.id} onPress={() => router.push(`/trip/${t.id}`)}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", fontSize: 16, color: colors.ink }}>{shortCity(t.originLabel)} → {shortCity(t.destinationLabel)}</Text>
                  <Text style={{ color: colors.muted, marginTop: 3 }}>{dateShort(t.departureAt)} · {modeInfo(t.mode).label}</Text>
                </View>
                <Text style={{ fontWeight: "800", color: colors.traveler }}>{eur(t.contributionAmount)}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <Badge label={st.label} tone={st.tone} />
                {t.pendingRequests > 0 ? <Badge label={`${t.pendingRequests} demande${t.pendingRequests > 1 ? "s" : ""}`} tone="warning" icon="flash" /> : null}
                {t.compatibleParcelsCount > 0 ? <Badge label={`${t.compatibleParcelsCount} colis compatible${t.compatibleParcelsCount > 1 ? "s" : ""}`} tone="traveler" /> : null}
              </View>
            </Card>
          );
        })
      )}
    </>
  );
}

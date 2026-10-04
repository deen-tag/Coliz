import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, H2, SectionTitle, SkeletonList } from "@/components/ui";
import { CityField } from "@/components/CityField";
import { TripCard } from "@/components/TripCard";
import { goLogin } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { colors, radius, shadow } from "@/lib/theme";
import { bookingStatusInfo } from "@/lib/booking-status";
import { shortCity } from "@/lib/format";
import type { BookingListItem, CityChoice, Dashboard, SearchResponse } from "@/lib/types";

export default function Home() {
  const { user } = useAuth();
  const [from, setFrom] = useState<CityChoice | null>(null);
  const [to, setTo] = useState<CityChoice | null>(null);

  const latest = useApi<SearchResponse>("/api/trips/search-public", { query: { limit: 5 } });
  const dash = useApi<Dashboard>(user ? "/api/dashboard" : null);
  const bookings = useApi<BookingListItem[]>(user ? "/api/bookings" : null);

  const todo = (bookings.data ?? []).filter((b) => bookingStatusInfo(b.status, b.role, b.counterpart).actionNeeded);

  function act(path: "/parcel/new" | "/trip/new") {
    if (!user) return goLogin(path);
    router.push(path);
  }

  function refresh() {
    latest.refresh();
    dash.refresh();
    bookings.refresh();
  }

  return (
    <Screen topInset refreshing={latest.refreshing} onRefresh={refresh}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image source={require("../../../assets/icon.png")} style={{ width: 40, height: 40, borderRadius: 10, marginRight: 10 }} />
          <View>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{user ? "Bonjour" : "Bienvenue sur"}</Text>
            <Text style={{ color: colors.ink, fontSize: 20, fontWeight: "800" }}>{user ? user.firstName : "Coliz"}</Text>
          </View>
        </View>
        {user ? (
          <Pressable onPress={() => router.push("/notifications")} hitSlop={10} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={26} color={colors.ink} />
            {(dash.data?.unreadNotifications ?? 0) > 0 ? (
              <View style={{ position: "absolute", top: 6, right: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.error, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{dash.data!.unreadNotifications}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <Pressable onPress={() => act("/parcel/new")} style={[{ flex: 1, backgroundColor: colors.primary, borderRadius: radius.card, padding: 16, minHeight: 132 }, shadow]} accessibilityRole="button">
          <Ionicons name="cube-outline" size={28} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16, marginTop: 10 }}>J'envoie un colis</Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4 }}>Trouvez un voyageur qui fait déjà le trajet.</Text>
        </Pressable>
        <Pressable onPress={() => act("/trip/new")} style={[{ flex: 1, backgroundColor: colors.traveler, borderRadius: radius.card, padding: 16, minHeight: 132 }, shadow]} accessibilityRole="button">
          <Ionicons name="airplane-outline" size={28} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16, marginTop: 10 }}>Je propose un trajet</Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4 }}>Votre trajet peut vous rapporter.</Text>
        </Pressable>
      </View>

      <Card>
        <H2>Chercher un trajet</H2>
        <View style={{ marginTop: 10 }}>
          <CityField label="Départ" placeholder="Ville, aéroport, gare ou port" value={from} onChange={setFrom} icon="radio-button-on-outline" allowLocation />
          <CityField label="Arrivée" placeholder="Ville, aéroport, gare ou port" value={to} onChange={setTo} icon="flag-outline" />
        </View>
        <Button
          title="Voir les trajets disponibles"
          icon="search"
          onPress={() => router.push({ pathname: "/(tabs)/search", params: { from: from ? shortCity(from.label) : "", to: to ? shortCity(to.label) : "", run: "1" } })}
        />
      </Card>

      {todo.length > 0 ? (
        <>
          <SectionTitle title="À faire" />
          {todo.slice(0, 3).map((b) => {
            const info = bookingStatusInfo(b.status, b.role, b.counterpart);
            return (
              <Card key={b.id} onPress={() => router.push(`/booking/${b.id}`)}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: colors.ink }}>{shortCity(b.originLabel)} → {shortCity(b.destinationLabel)}</Text>
                    <Text style={{ color: colors.muted, marginTop: 3 }}>{info.title}</Text>
                  </View>
                  <Badge label="Action requise" tone="warning" />
                </View>
              </Card>
            );
          })}
        </>
      ) : null}

      <SectionTitle title="Derniers trajets" action={{ label: "Tout voir", onPress: () => router.push("/(tabs)/search") }} />
      {latest.loading ? (
        <SkeletonList count={3} />
      ) : latest.error && !latest.data ? (
        <Card><H2>Impossible de charger les trajets</H2><Text style={{ color: colors.muted, marginTop: 4, marginBottom: 10 }}>{latest.error.message}</Text><Button title="Réessayer" variant="secondary" small onPress={latest.reload} /></Card>
      ) : (latest.data?.trips ?? []).length === 0 ? (
        <Card><Text style={{ color: colors.muted }}>Aucun trajet disponible pour le moment. Revenez bientôt ou proposez le vôtre !</Text></Card>
      ) : (
        latest.data!.trips.map((t) => <TripCard key={t.tripId} trip={t} onPress={() => router.push(`/trip/${t.tripId}`)} />)
      )}
    </Screen>
  );
}

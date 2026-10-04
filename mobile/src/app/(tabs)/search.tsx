import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Platform, RefreshControl, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import { Button, EmptyState, ErrorState, Segmented, SkeletonList } from "@/components/ui";
import { CityField } from "@/components/CityField";
import { DateField } from "@/components/DateField";
import { TripCard } from "@/components/TripCard";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/theme";
import { HAS_ANDROID_MAPS_KEY } from "@/lib/config";
import { shortCity } from "@/lib/format";
import type { CityChoice, SearchResponse, TripResult } from "@/lib/types";

const PAGE = 15;
const canMap = Platform.OS === "ios" || HAS_ANDROID_MAPS_KEY;

// Coordonnées d'une ville choisie dans la liste (0,0 = inconnues) : le serveur cherche alors
// dans un rayon autour d'elle, pour que « Paris » trouve aussi Orly, Roissy, Versailles…
const geoOf = (c: CityChoice | null, key: "from" | "to") =>
  c && (c.lat || c.lng) ? { [`${key}Lat`]: c.lat, [`${key}Lng`]: c.lng } : {};

export default function Search() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ from?: string; to?: string; run?: string }>();
  const [from, setFrom] = useState<CityChoice | null>(null);
  const [to, setTo] = useState<CityChoice | null>(null);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [items, setItems] = useState<TripResult[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const run = useCallback(
    async (mode: "reset" | "more" | "refresh", f = fromText, t = toText, d = date, offset = 0, geo: Record<string, number> = { ...geoOf(from, "from"), ...geoOf(to, "to") }) => {
      if (mode === "reset") setLoading(true);
      if (mode === "more") setLoadingMore(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      try {
        const res = await api<SearchResponse>("/api/trips/search-public", {
          auth: false,
          query: { from: f, to: t, ...geo, date: d ? d.toISOString() : undefined, limit: PAGE, offset },
        });
        setItems((prev) => (mode === "more" ? [...prev, ...res.trips] : res.trips));
        setTotal(res.total);
        setHasMore(res.hasMore);
      } catch (e) {
        setError(e instanceof ApiError ? e : new ApiError(500, "Une erreur est survenue."));
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [fromText, toText, date, from, to]
  );

  // Premier chargement, ou arrivée depuis l'accueil avec des villes déjà saisies.
  useEffect(() => {
    const f = params.from ?? "";
    const t = params.to ?? "";
    if (f) {
      setFromText(f);
      setFrom({ label: f, lat: 0, lng: 0 });
    }
    if (t) {
      setToText(t);
      setTo({ label: t, lat: 0, lng: 0 });
    }
    run("reset", f, t, null, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.from, params.to, params.run]);

  function apply(nf: CityChoice | null, nt: CityChoice | null, nd: Date | null) {
    const f = nf ? shortCity(nf.label) : "";
    const t = nt ? shortCity(nt.label) : "";
    setFromText(f);
    setToText(t);
    run("reset", f, t, nd, 0, { ...geoOf(nf, "from"), ...geoOf(nt, "to") });
  }

  const header = (
    <View style={{ paddingTop: 16 }}>
      <Text style={{ fontSize: 26, fontWeight: "800", color: colors.ink, marginBottom: 14 }}>Rechercher un trajet</Text>
      <CityField label="Départ" placeholder="Ville, aéroport, gare ou port" value={from} onChange={(c) => { setFrom(c); apply(c, to, date); }} icon="radio-button-on-outline" allowLocation />
      <CityField label="Arrivée" placeholder="Ville, aéroport, gare ou port" value={to} onChange={(c) => { setTo(c); apply(from, c, date); }} icon="flag-outline" />
      <DateField label="Date (± 3 jours)" value={date} clearable minimumDate={new Date()} placeholder="Toutes les dates" onChange={(d) => { setDate(d); apply(from, to, d); }} />
      {canMap ? <Segmented options={[{ key: "list", label: "Liste" }, { key: "map", label: "Carte" }]} value={view} onChange={setView} /> : null}
      {!loading && !error ? <Text style={{ color: colors.muted, marginBottom: 10 }}>{total} trajet{total > 1 ? "s" : ""} disponible{total > 1 ? "s" : ""}</Text> : null}
    </View>
  );

  if (view === "map" && canMap) {
    const pts = items.filter((t) => t.originLat || t.originLng);
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingHorizontal: 16 }}>
        {header}
        <View style={{ flex: 1, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
          <MapView style={{ flex: 1 }} initialRegion={{ latitude: pts[0]?.originLat ?? 46.6, longitude: pts[0]?.originLng ?? 2.4, latitudeDelta: 12, longitudeDelta: 12 }} showsUserLocation>
            {pts.map((t) => (
              <Marker key={t.tripId} coordinate={{ latitude: t.originLat, longitude: t.originLng }} title={`${shortCity(t.originLabel)} → ${shortCity(t.destinationLabel)}`} description={`${t.totalAmount} € · ${t.traveler.firstName}`} pinColor={colors.primary} onCalloutPress={() => router.push(`/trip/${t.tripId}`)} />
            ))}
          </MapView>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <FlatList
        data={items}
        keyExtractor={(t) => t.tripId}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => run("refresh", fromText, toText, date, 0)} tintColor={colors.primary} />}
        renderItem={({ item }) => <TripCard trip={item} onPress={() => router.push(`/trip/${item.tripId}`)} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasMore && !loadingMore && !loading) run("more", fromText, toText, date, items.length);
        }}
        ListEmptyComponent={
          loading ? (
            <SkeletonList count={4} />
          ) : error ? (
            <ErrorState message={error.message} network={error.isNetwork} onRetry={() => run("reset")} />
          ) : (
            <EmptyState icon="search-outline" title="Aucun trajet trouvé" text="Essayez une autre date, ou publiez votre besoin d'envoi : les voyageurs compatibles seront prévenus." action={{ label: "Envoyer un colis", onPress: () => router.push("/parcel/new") }} />
          )
        }
        ListFooterComponent={loadingMore ? <SkeletonList count={1} /> : hasMore && items.length > 0 ? <Button title="Voir plus" variant="secondary" onPress={() => run("more", fromText, toText, date, items.length)} /> : null}
      />
    </View>
  );
}

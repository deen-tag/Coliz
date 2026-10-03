import React, { useState } from "react";
import { Alert, Modal, Pressable, Share, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { Avatar, Badge, Button, Card, Divider, ErrorState, H2, InlineMessage, Row, SkeletonList, Stars } from "@/components/ui";
import { RouteMap } from "@/components/RouteMap";
import { goLogin } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { api, errorMessage } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { colors } from "@/lib/theme";
import { dateLong, eur, modeInfo, shortCity, timeShort } from "@/lib/format";
import { openInMaps } from "@/lib/maps";
import type { IconName } from "@/components/ui";
import type { MyParcel, TripDetail } from "@/lib/types";

export default function TripScreen() {
  const { id, parcelId } = useLocalSearchParams<{ id: string; parcelId?: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: trip, loading, error, reload, refreshing, refresh } = useApi<TripDetail>(`/api/trips/${id}`);
  const [picker, setPicker] = useState(false);
  const [booking, setBooking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const parcels = useApi<MyParcel[]>(user && picker ? "/api/parcels" : null, { reloadOnFocus: false });

  if (loading) return <Screen><SkeletonList count={3} /></Screen>;
  if (error || !trip) return <Screen scroll={false}><ErrorState message={error?.message ?? "Trajet introuvable."} network={error?.isNetwork} onRetry={reload} /></Screen>;

  const mode = modeInfo(trip.mode);
  const mine = user?.id === trip.traveler.id;
  const bookable = !mine && trip.remainingParcels > 0 && ["PUBLISHED", "PARTIALLY_BOOKED"].includes(trip.status) && new Date(trip.departureAt) > new Date();

  async function share() {
    // Le lien ouvre la page du site (qui fonctionne même pour quelqu'un sans l'application).
    const url = `${API_URL}/trajets/${trip!.id}`;
    await Share.share({
      message: `Trajet ${shortCity(trip!.originLabel)} → ${shortCity(trip!.destinationLabel)} le ${dateLong(trip!.departureAt)} sur Coliz : ${url}`,
      url,
    }).catch(() => {});
  }

  async function reserve(pid: string) {
    setBooking(true);
    setMsg(null);
    try {
      const b = await api<{ id: string }>("/api/bookings", { method: "POST", body: { parcelId: pid, tripId: trip!.id } });
      setPicker(false);
      router.replace(`/booking/${b.id}`);
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setBooking(false);
    }
  }

  function onReserve() {
    if (!user) return goLogin(`/trip/${trip!.id}`);
    if (parcelId) {
      Alert.alert("Envoyer la demande ?", `Le voyageur recevra votre demande. Aucun paiement n'est demandé pour l'instant.`, [
        { text: "Annuler", style: "cancel" },
        { text: "Envoyer", onPress: () => reserve(parcelId) },
      ]);
    } else {
      setPicker(true);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <Pressable onPress={share} hitSlop={12} accessibilityLabel="Partager"><Ionicons name="share-outline" size={24} color={colors.primary} /></Pressable> }} />
      <Screen
        refreshing={refreshing}
        onRefresh={refresh}
        footer={
          bookable ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.primary }}>{eur(trip.totalAmount)}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>tout compris</Text>
              </View>
              <Button title="Réserver ce trajet" onPress={onReserve} style={{ flex: 1 }} />
            </View>
          ) : mine ? (
            <Text style={{ textAlign: "center", color: colors.muted, paddingVertical: 8 }}>C'est votre trajet.</Text>
          ) : (
            <Text style={{ textAlign: "center", color: colors.muted, paddingVertical: 8 }}>Ce trajet n'accepte plus de colis.</Text>
          )
        }
      >
        {msg ? <InlineMessage text={msg} /> : null}
        <Card>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
            <Badge label={mode.label} tone="traveler" icon={mode.icon as IconName} />
            <Badge label={`${trip.remainingParcels} place${trip.remainingParcels > 1 ? "s" : ""} restante${trip.remainingParcels > 1 ? "s" : ""}`} tone={trip.remainingParcels > 0 ? "success" : "error"} />
          </View>
          <View style={{ flexDirection: "row" }}>
            <View style={{ alignItems: "center", marginRight: 12, paddingTop: 4 }}>
              <Ionicons name="radio-button-on" size={18} color={colors.primary} />
              <View style={{ width: 2, flex: 1, backgroundColor: colors.line, marginVertical: 3 }} />
              <Ionicons name="flag" size={18} color={colors.traveler} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink }}>{shortCity(trip.originLabel)}</Text>
              <Text style={{ color: colors.muted, marginBottom: 16 }}>{dateLong(trip.departureAt)} · {timeShort(trip.departureAt)}</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink }}>{shortCity(trip.destinationLabel)}</Text>
              <Text style={{ color: colors.muted }}>{trip.arrivalAt ? `${dateLong(trip.arrivalAt)} · ${timeShort(trip.arrivalAt)}` : "Arrivée non précisée"}</Text>
            </View>
          </View>
        </Card>

        <RouteMap origin={{ label: trip.originLabel, lat: trip.originLat, lng: trip.originLng }} destination={{ label: trip.destinationLabel, lat: trip.destinationLat, lng: trip.destinationLng }} />

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <Row icon="person-outline" title={trip.traveler.firstName} subtitle={trip.traveler.ratingCount > 0 ? `${Number(trip.traveler.ratingAverage).toFixed(1)} / 5 · ${trip.traveler.ratingCount} avis` : "Nouveau voyageur"} onPress={() => router.push(`/traveler/${trip.traveler.id}`)}
            right={<View style={{ alignItems: "flex-end" }}>{trip.traveler.ratingCount > 0 ? <Stars value={trip.traveler.ratingAverage} /> : null}{trip.traveler.identityVerified ? <Badge label="Vérifié" tone="success" icon="shield-checkmark" /> : null}</View>} />
        </Card>

        <Card>
          <H2 style={{ marginBottom: 10 }}>Capacité acceptée</H2>
          <Text style={{ color: colors.ink, lineHeight: 22 }}>
            Jusqu'à {trip.capacityWeightKg} kg · {trip.capacityLengthCm} × {trip.capacityWidthCm} × {trip.capacityHeightCm} cm
          </Text>
          {trip.pickupPointLabel || trip.dropoffPointLabel ? <Divider /> : null}
          {trip.pickupPointLabel ? <Text style={{ marginTop: 10, color: colors.ink }}>Remise : {trip.pickupPointLabel}</Text> : null}
          {trip.dropoffPointLabel ? <Text style={{ marginTop: 6, color: colors.ink }}>Livraison : {trip.dropoffPointLabel}</Text> : null}
        </Card>

        <Card>
          <H2 style={{ marginBottom: 8 }}>Prix</H2>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>
            {eur(trip.totalAmount)} tout compris. Le paiement n'est demandé qu'après l'accord du voyageur, et l'argent n'est versé qu'à la livraison confirmée.
          </Text>
        </Card>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button title="Ouvrir le départ" small variant="secondary" icon="map-outline" style={{ flex: 1 }} onPress={() => openInMaps(trip.originLabel, trip.originLat, trip.originLng)} />
          <Button title="Partager" small variant="secondary" icon="share-outline" style={{ flex: 1 }} onPress={share} />
        </View>
      </Screen>

      <Modal visible={picker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicker(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, paddingBottom: insets.bottom + 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <H2>Quel colis envoyer ?</H2>
            <Pressable onPress={() => setPicker(false)} hitSlop={12}><Ionicons name="close" size={26} color={colors.ink} /></Pressable>
          </View>
          {msg ? <InlineMessage text={msg} /> : null}
          {parcels.loading ? <SkeletonList count={2} /> : (
            <>
              {(parcels.data ?? []).filter((p) => ["SEARCHING", "MATCHED"].includes(p.status) && !(p.booking && p.booking.status !== "CANCELLED")).map((p) => (
                <Card key={p.id} onPress={() => !booking && reserve(p.id)}>
                  <Text style={{ fontWeight: "700", color: colors.ink }}>{shortCity(p.originLabel)} → {shortCity(p.destinationLabel)}</Text>
                  <Text style={{ color: colors.muted, marginTop: 2 }}>Choisir ce colis</Text>
                </Card>
              ))}
              <Button title="Décrire un nouveau colis" variant="secondary" icon="add" onPress={() => { setPicker(false); router.push({ pathname: "/parcel/new", params: { tripId: trip.id } }); }} />
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

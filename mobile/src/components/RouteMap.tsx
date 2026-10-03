import React, { useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { colors } from "@/lib/theme";
import { HAS_ANDROID_MAPS_KEY } from "@/lib/config";
import { Button } from "./ui";
import { openInMaps } from "@/lib/maps";

type Pt = { label: string; lat: number; lng: number };

// Carte du trajet. Sur Android, la carte intégrée demande une clé Google Maps (voir README) ;
// sans clé, on propose à la place d'ouvrir l'application Maps du téléphone.
export function RouteMap({ origin, destination, height = 200 }: { origin: Pt; destination: Pt; height?: number }) {
  const ref = useRef<MapView>(null);
  const canEmbed = Platform.OS === "ios" || HAS_ANDROID_MAPS_KEY;

  useEffect(() => {
    if (!canEmbed) return;
    const t = setTimeout(() => {
      ref.current?.fitToCoordinates(
        [
          { latitude: origin.lat, longitude: origin.lng },
          { latitude: destination.lat, longitude: destination.lng },
        ],
        { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: false }
      );
    }, 300);
    return () => clearTimeout(t);
  }, [canEmbed, origin.lat, origin.lng, destination.lat, destination.lng]);

  if (!canEmbed) {
    return (
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Départ" small variant="secondary" icon="navigate-outline" style={{ flex: 1 }} onPress={() => openInMaps(origin.label, origin.lat, origin.lng)} />
        <Button title="Arrivée" small variant="secondary" icon="flag-outline" style={{ flex: 1 }} onPress={() => openInMaps(destination.label, destination.lat, destination.lng)} />
      </View>
    );
  }
  return (
    <View style={{ height, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
      <MapView ref={ref} style={{ flex: 1 }} scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false} toolbarEnabled={false}
        initialRegion={{ latitude: (origin.lat + destination.lat) / 2, longitude: (origin.lng + destination.lng) / 2, latitudeDelta: Math.max(1, Math.abs(origin.lat - destination.lat) * 1.8), longitudeDelta: Math.max(1, Math.abs(origin.lng - destination.lng) * 1.8) }}>
        <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} title={origin.label} pinColor={colors.primary} />
        <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} title={destination.label} pinColor={colors.traveler} />
        <Polyline coordinates={[{ latitude: origin.lat, longitude: origin.lng }, { latitude: destination.lat, longitude: destination.lng }]} strokeColor={colors.primary} strokeWidth={3} lineDashPattern={[8, 6]} />
      </MapView>
    </View>
  );
}

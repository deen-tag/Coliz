import React, { useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { RequireAuth } from "@/components/RequireAuth";
import { Button, Card, H2, InlineMessage, Input } from "@/components/ui";
import { CityField } from "@/components/CityField";
import { api, errorMessage } from "@/lib/api";
import { pickPhoto, uploadImage } from "@/lib/photos";
import { colors, radius } from "@/lib/theme";
import type { CityChoice } from "@/lib/types";

export default function NewParcel() {
  return (
    <RequireAuth title="Envoyer un colis" text="Connectez-vous pour décrire votre colis et trouver un voyageur.">
      <Form />
    </RequireAuth>
  );
}

const num = (s: string) => Number(s.replace(",", "."));

function Form() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const [origin, setOrigin] = useState<CityChoice | null>(null);
  const [dest, setDest] = useState<CityChoice | null>(null);
  const [weight, setWeight] = useState("");
  const [l, setL] = useState("");
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [count, setCount] = useState("1");
  const [value, setValue] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function choosePhoto() {
    Alert.alert("Photo du colis", undefined, [
      { text: "Prendre une photo", onPress: async () => { const u = await pickPhoto("camera"); if (u) setPhoto(u); } },
      { text: "Choisir dans la galerie", onPress: async () => { const u = await pickPhoto("library"); if (u) setPhoto(u); } },
      { text: "Annuler", style: "cancel" },
    ]);
  }

  async function submit() {
    if (!origin || !dest) return setError("Choisissez la ville de départ et la ville d'arrivée.");
    if (![weight, l, w, h].every((v) => num(v) > 0)) return setError("Renseignez le poids et les trois dimensions du colis.");
    if (value.trim() === "" || num(value) < 0) return setError("Indiquez la valeur déclarée (0 si aucune).");
    if (!accepted) return setError("Vous devez confirmer avoir lu la liste des objets interdits.");
    setError(null);
    setLoading(true);
    try {
      let photoUrl: string | undefined;
      if (photo) photoUrl = await uploadImage("/api/uploads/parcel-photo", photo);
      const parcel = await api<{ id: string }>("/api/parcels", {
        method: "POST",
        body: {
          originLabel: origin.label, originLat: origin.lat, originLng: origin.lng,
          destinationLabel: dest.label, destinationLat: dest.lat, destinationLng: dest.lng,
          weightKg: num(weight), lengthCm: num(l), widthCm: num(w), heightCm: num(h),
          parcelCount: Math.max(1, Math.round(num(count) || 1)),
          declaredValue: num(value),
          photoUrl,
          prohibitedItemsAccepted: true,
        },
      });
      if (tripId) {
        // Venait d'un trajet précis : on envoie directement la demande.
        const b = await api<{ id: string }>("/api/bookings", { method: "POST", body: { parcelId: parcel.id, tripId } });
        router.replace(`/booking/${b.id}`);
      } else {
        router.replace(`/parcel/${parcel.id}`);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen footer={<Button title={tripId ? "Envoyer la demande" : "Trouver un voyageur"} onPress={submit} loading={loading} />}>
      {error ? <InlineMessage text={error} /> : null}
      <H2 style={{ marginBottom: 12 }}>Trajet souhaité</H2>
      <CityField label="Départ" placeholder="Où récupérer le colis ?" value={origin} onChange={setOrigin} icon="radio-button-on-outline" allowLocation />
      <CityField label="Arrivée" placeholder="Où l'envoyer ?" value={dest} onChange={setDest} icon="flag-outline" />

      <H2 style={{ marginVertical: 12 }}>Le colis</H2>
      <Input label="Poids (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Ex. 4,5" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Input label="Long. (cm)" value={l} onChangeText={setL} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Input label="Larg. (cm)" value={w} onChangeText={setW} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Input label="Haut. (cm)" value={h} onChangeText={setH} keyboardType="decimal-pad" /></View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Input label="Nombre de colis" value={count} onChangeText={setCount} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Input label="Valeur déclarée (€)" value={value} onChangeText={setValue} keyboardType="decimal-pad" /></View>
      </View>

      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 6 }}>Photo (facultatif)</Text>
      <Pressable onPress={choosePhoto} style={{ height: photo ? 180 : 96, borderRadius: radius.control, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.line, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 16 }} accessibilityRole="button" accessibilityLabel="Ajouter une photo du colis">
        {photo ? <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : (<><Ionicons name="camera-outline" size={28} color={colors.muted} /><Text style={{ color: colors.muted, marginTop: 4 }}>Prendre ou choisir une photo</Text></>)}
      </Pressable>

      <Card>
        <Pressable onPress={() => setAccepted((a) => !a)} style={{ flexDirection: "row", alignItems: "flex-start" }} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }}>
          <Ionicons name={accepted ? "checkbox" : "square-outline"} size={26} color={accepted ? colors.primary : colors.muted} style={{ marginRight: 10 }} />
          <Text style={{ flex: 1, color: colors.ink, lineHeight: 21 }}>
            Je confirme avoir lu la liste des objets interdits (armes, stupéfiants, matières dangereuses, argent liquide, contrefaçons…) et que mon colis n'en contient aucun.
          </Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

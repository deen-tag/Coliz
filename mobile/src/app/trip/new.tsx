import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { RequireAuth } from "@/components/RequireAuth";
import { Button, Card, Chip, H2, InlineMessage, Input } from "@/components/ui";
import { CityField } from "@/components/CityField";
import { DateField } from "@/components/DateField";
import { api, errorMessage } from "@/lib/api";
import { MODES } from "@/lib/format";
import { colors } from "@/lib/theme";
import type { CityChoice } from "@/lib/types";
import type { IconName } from "@/components/ui";

export default function NewTrip() {
  return (
    <RequireAuth title="Proposer un trajet" text="Connectez-vous pour publier votre trajet et recevoir des demandes.">
      <Form />
    </RequireAuth>
  );
}

const num = (s: string) => Number(s.replace(",", "."));

function Form() {
  const [origin, setOrigin] = useState<CityChoice | null>(null);
  const [dest, setDest] = useState<CityChoice | null>(null);
  const [departure, setDeparture] = useState<Date | null>(null);
  const [arrival, setArrival] = useState<Date | null>(null);
  const [mode, setMode] = useState("CAR");
  const [confirmed, setConfirmed] = useState(false);
  const [weight, setWeight] = useState("");
  const [l, setL] = useState("");
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [parcels, setParcels] = useState("1");
  const [price, setPrice] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!origin || !dest) return setError("Choisissez la ville de départ et la ville d'arrivée.");
    if (!departure) return setError("Indiquez la date et l'heure de départ.");
    if (arrival && arrival <= departure) return setError("L'arrivée doit être après le départ.");
    if (![weight, l, w, h].every((v) => num(v) > 0)) return setError("Renseignez la capacité (poids et dimensions maximales).");
    if (price.trim() === "" || num(price) < 0) return setError("Indiquez la somme que vous souhaitez recevoir.");
    if (mode === "CAR" && !confirmed) return setError("Pour la voiture, confirmez que le trajet est prévu indépendamment du colis.");
    setError(null);
    setLoading(true);
    try {
      const trip = await api<{ id: string }>("/api/trips", {
        method: "POST",
        body: {
          originLabel: origin.label, originLat: origin.lat, originLng: origin.lng,
          destinationLabel: dest.label, destinationLat: dest.lat, destinationLng: dest.lng,
          departureAt: departure.toISOString(),
          arrivalAt: arrival ? arrival.toISOString() : undefined,
          mode,
          preexistingJourneyConfirmed: confirmed,
          capacityWeightKg: num(weight), capacityLengthCm: num(l), capacityWidthCm: num(w), capacityHeightCm: num(h),
          capacityParcels: Math.max(1, Math.round(num(parcels) || 1)),
          pickupPointLabel: pickup.trim() || undefined,
          dropoffPointLabel: dropoff.trim() || undefined,
          contributionAmount: num(price),
        },
      });
      router.replace(`/trip/${trip.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen footer={<Button title="Publier mon trajet" variant="traveler" onPress={submit} loading={loading} />}>
      {error ? <InlineMessage text={error} /> : null}
      <H2 style={{ marginBottom: 12 }}>Votre voyage</H2>
      <CityField label="Départ" placeholder="D'où partez-vous ?" value={origin} onChange={setOrigin} icon="radio-button-on-outline" allowLocation />
      <CityField label="Arrivée" placeholder="Où allez-vous ?" value={dest} onChange={setDest} icon="flag-outline" />
      <DateField label="Départ" value={departure} onChange={setDeparture} withTime minimumDate={new Date()} />
      <DateField label="Arrivée (facultatif)" value={arrival} onChange={setArrival} withTime clearable minimumDate={departure ?? new Date()} placeholder="Non précisée" />

      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 8 }}>Moyen de transport</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 6 }}>
        {Object.entries(MODES).map(([k, m]) => <Chip key={k} label={m.label} icon={m.icon as IconName} selected={mode === k} onPress={() => setMode(k)} />)}
      </View>
      {mode === "CAR" ? (
        <Card>
          <Pressable onPress={() => setConfirmed((c) => !c)} style={{ flexDirection: "row", alignItems: "flex-start" }} accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }}>
            <Ionicons name={confirmed ? "checkbox" : "square-outline"} size={26} color={confirmed ? colors.primary : colors.muted} style={{ marginRight: 10 }} />
            <Text style={{ flex: 1, color: colors.ink, lineHeight: 21 }}>Je confirme que ce trajet est prévu indépendamment du colis (je ne fais pas la route uniquement pour livrer).</Text>
          </Pressable>
        </Card>
      ) : null}

      <H2 style={{ marginVertical: 12 }}>Ce que vous acceptez</H2>
      <Input label="Poids maximum (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Input label="Long. (cm)" value={l} onChangeText={setL} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Input label="Larg. (cm)" value={w} onChangeText={setW} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Input label="Haut. (cm)" value={h} onChangeText={setH} keyboardType="decimal-pad" /></View>
      </View>
      <Input label="Nombre de colis acceptés" value={parcels} onChangeText={setParcels} keyboardType="number-pad" />
      <Input label="Votre rémunération par colis (€)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" hint="Coliz ajoute sa commission : l'expéditeur voit le prix tout compris." />
      <Input label="Point de remise (facultatif)" value={pickup} onChangeText={setPickup} placeholder="Ex. Gare de Lyon-Part-Dieu" />
      <Input label="Point de livraison (facultatif)" value={dropoff} onChangeText={setDropoff} placeholder="Ex. Aéroport d'Alger" />
    </Screen>
  );
}

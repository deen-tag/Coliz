import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { Body, Button, Chip, InlineMessage, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { colors } from "@/lib/theme";

const CATEGORIES = [
  { key: "colis_endommage", label: "Colis endommagé" },
  { key: "colis_perdu", label: "Colis perdu" },
  { key: "retard", label: "Retard" },
  { key: "comportement", label: "Comportement" },
  { key: "autre", label: "Autre" },
];

export default function Incident() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [category, setCategory] = useState("autre");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (description.trim().length < 10) return setError("Décrivez le problème en quelques phrases (10 caractères minimum).");
    setLoading(true);
    setError(null);
    try {
      await api("/api/incidents", { method: "POST", body: { bookingId, category, description: description.trim() } });
      Alert.alert("Signalement envoyé", "Notre équipe a été prévenue. L'autre personne est informée.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen footer={<Button title="Envoyer le signalement" variant="danger" onPress={submit} loading={loading} />}>
      <Body muted style={{ marginBottom: 16 }}>Expliquez ce qui s'est passé. Coliz est un intermédiaire : nous examinons chaque signalement.</Body>
      {error ? <InlineMessage text={error} /> : null}
      <Text style={{ fontWeight: "600", color: colors.ink, marginBottom: 8 }}>Type de problème</Text>
      <Wrap>{CATEGORIES.map((c) => <Chip key={c.key} label={c.label} selected={category === c.key} onPress={() => setCategory(c.key)} />)}</Wrap>
      <Input label="Description" value={description} onChangeText={setDescription} multiline maxLength={2000} placeholder="Que s'est-il passé ?" />
    </Screen>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>{children}</View>;
}

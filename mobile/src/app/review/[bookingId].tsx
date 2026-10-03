import React, { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/Screen";
import { Body, Button, H2, InlineMessage, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { colors } from "@/lib/theme";

export default function Review() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (rating < 1) return setError("Choisissez une note de 1 à 5 étoiles.");
    setLoading(true);
    setError(null);
    try {
      await api("/api/reviews", { method: "POST", body: { bookingId, rating, comment: comment.trim() || undefined } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert("Merci !", "Votre avis a été publié.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen footer={<Button title="Publier mon avis" onPress={submit} loading={loading} />}>
      <H2 style={{ marginBottom: 6 }}>Comment s'est passé l'envoi ?</H2>
      <Body muted style={{ marginBottom: 18 }}>Votre avis aide les prochains utilisateurs.</Body>
      {error ? <InlineMessage text={error} /> : null}
      <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 22 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable key={i} onPress={() => setRating(i)} hitSlop={6} style={{ padding: 6 }} accessibilityLabel={`${i} étoile${i > 1 ? "s" : ""}`}>
            <Ionicons name={i <= rating ? "star" : "star-outline"} size={42} color={colors.traveler} />
          </Pressable>
        ))}
      </View>
      <Input label="Commentaire (facultatif)" value={comment} onChangeText={setComment} multiline maxLength={1000} placeholder="Ponctualité, soin, communication…" />
    </Screen>
  );
}

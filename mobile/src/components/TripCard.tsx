import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Badge, Card, Stars } from "./ui";
import { colors } from "@/lib/theme";
import { dateShort, eur, modeInfo, shortCity, timeShort } from "@/lib/format";
import type { IconName } from "./ui";
import type { TripResult } from "@/lib/types";

export function TripCard({ trip, onPress }: { trip: TripResult; onPress: () => void }) {
  const mode = modeInfo(trip.mode);
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
            {shortCity(trip.originLabel)} <Ionicons name="arrow-forward" size={16} color={colors.muted} /> {shortCity(trip.destinationLabel)}
          </Text>
          <Text style={{ color: colors.muted, marginTop: 3 }}>
            {dateShort(trip.departureAt)} · {timeShort(trip.departureAt)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.primary }}>{eur(trip.totalAmount)}</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>tout compris</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Avatar name={trip.traveler.firstName} uri={trip.traveler.avatarUrl} size={34} />
          <View style={{ marginLeft: 10 }}>
            <Text style={{ fontWeight: "600", color: colors.ink }}>{trip.traveler.firstName}</Text>
            {trip.traveler.ratingCount > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Stars value={trip.traveler.ratingAverage} size={11} />
                <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 4 }}>({trip.traveler.ratingCount})</Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: colors.muted }}>Nouveau</Text>
            )}
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Badge label={mode.label} tone="traveler" icon={mode.icon as IconName} />
          {trip.traveler.identityVerified ? <Badge label="Vérifié" tone="success" icon="shield-checkmark" /> : null}
        </View>
      </View>
    </Card>
  );
}

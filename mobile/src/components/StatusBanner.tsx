import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TONES } from "./ui";
import type { BookingStatusInfo } from "@/lib/booking-status";

const ICONS = { neutral: "information-circle", info: "information-circle", success: "checkmark-circle", warning: "time", error: "alert-circle" } as const;

export function StatusBanner({ info }: { info: BookingStatusInfo }) {
  const t = TONES[info.tone];
  return (
    <View style={{ backgroundColor: t.bg, borderRadius: 16, padding: 16, marginBottom: 14, flexDirection: "row" }}>
      <Ionicons name={ICONS[info.tone]} size={24} color={t.fg} style={{ marginRight: 12, marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.fg, fontWeight: "700", fontSize: 16 }}>{info.title}</Text>
        {info.hint ? <Text style={{ color: t.fg, marginTop: 4, lineHeight: 20 }}>{info.hint}</Text> : null}
      </View>
    </View>
  );
}

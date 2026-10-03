import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";
import type { TrackingTimeline } from "@/lib/booking-status";

export function Timeline({ data }: { data: TrackingTimeline }) {
  return (
    <View>
      {data.steps.map((s, i) => {
        const done = i < data.current;
        const current = i === data.current;
        const tint = current && data.warning ? colors.warning : done || current ? colors.primary : colors.line;
        return (
          <View key={s.label} style={{ flexDirection: "row", minHeight: 54 }}>
            <View style={{ alignItems: "center", width: 28, marginRight: 12 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: done ? colors.primary : current ? colors.surface : colors.surface, borderWidth: 2, borderColor: tint, alignItems: "center", justifyContent: "center" }}>
                {done ? <Ionicons name="checkmark" size={14} color="#fff" /> : current ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tint }} /> : null}
              </View>
              {i < data.steps.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: done ? colors.primary : colors.line }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 14 }}>
              <Text style={{ fontWeight: current ? "700" : "600", color: done || current ? colors.ink : colors.muted }}>{s.label}</Text>
              {(done || current) && s.note ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{s.note}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

import React from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { RequireAuth } from "@/components/RequireAuth";
import { Button, EmptyState, ErrorState, SkeletonList } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";
import { ago } from "@/lib/format";
import type { AppNotification } from "@/lib/types";
import type { IconName } from "@/components/ui";

const ICONS: Record<string, IconName> = {
  new_match: "sparkles-outline", booking_requested: "mail-unread-outline", booking_accepted: "checkmark-circle-outline", booking_refused: "close-circle-outline",
  price_proposed: "pricetag-outline", payment_confirmed: "card-outline", parcel_picked_up: "cube-outline", trip_departed: "airplane-outline",
  trip_arrived: "flag-outline", delivery_confirmed: "gift-outline", new_message: "chatbubble-outline", incident_action_required: "alert-circle-outline",
};

export default function Notifications() {
  return <RequireAuth title="Notifications" text="Connectez-vous pour voir vos notifications."><Inner /></RequireAuth>;
}

function Inner() {
  const { data, loading, error, refresh, refreshing, reload, setData } = useApi<AppNotification[]>("/api/notifications");
  const unread = (data ?? []).filter((n) => !n.readAt).length;

  async function markAll() {
    setData((data ?? []).map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    await api("/api/notifications", { method: "PATCH", body: { all: true } }).catch(() => reload());
  }
  async function open(n: AppNotification) {
    if (!n.readAt) {
      setData((data ?? []).map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      api("/api/notifications", { method: "PATCH", body: { id: n.id } }).catch(() => {});
    }
    router.push(n.type === "new_match" ? "/(tabs)/activity" : "/(tabs)/activity");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={data ?? []}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={unread > 0 ? <View style={{ padding: 16, paddingBottom: 4 }}><Button title={`Tout marquer comme lu (${unread})`} variant="secondary" small onPress={markAll} /></View> : null}
        ListEmptyComponent={loading ? <View style={{ padding: 16 }}><SkeletonList count={5} /></View> : error ? <ErrorState message={error.message} network={error.isNetwork} onRetry={reload} /> : <EmptyState icon="notifications-off-outline" title="Aucune notification" text="Vous serez prévenu ici des demandes, paiements et livraisons." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)} style={({ pressed }) => [{ flexDirection: "row", padding: 16, backgroundColor: item.readAt ? "transparent" : colors.primaryLight, minHeight: 68 }, pressed && { opacity: 0.8 }]} accessibilityRole="button">
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
              <Ionicons name={ICONS[item.type] ?? "notifications-outline"} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontWeight: item.readAt ? "400" : "700", lineHeight: 21 }}>{item.content}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{ago(item.createdAt)}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

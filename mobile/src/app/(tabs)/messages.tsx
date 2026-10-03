import React from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RequireAuth } from "@/components/RequireAuth";
import { Avatar, EmptyState, ErrorState, H1, SkeletonList } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { colors } from "@/lib/theme";
import { relative } from "@/lib/format";
import type { Conversation } from "@/lib/types";

export default function Messages() {
  return (
    <RequireAuth title="Votre messagerie" text="Connectez-vous pour échanger avec les voyageurs et les expéditeurs." icon="chatbubbles-outline">
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const insets = useSafeAreaInsets();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Conversation[]>("/api/messages/conversations", { pollMs: 15000 });
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <H1 style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>Messages</H1>
      <FlatList
        data={data ?? []}
        keyExtractor={(c) => c.bookingId}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? <View style={{ padding: 16 }}><SkeletonList count={5} /></View>
          : error ? <ErrorState message={error.message} network={error.isNetwork} onRetry={reload} />
          : <EmptyState icon="chatbubble-ellipses-outline" title="Aucune conversation" text="Une conversation s'ouvre automatiquement dès qu'une demande de réservation est envoyée." />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/chat/${item.bookingId}`)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, minHeight: 72 }, pressed && { backgroundColor: colors.pressed }]} accessibilityRole="button">
            <Avatar name={item.otherUser.firstName} uri={item.otherUser.avatarUrl} size={48} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "700", fontSize: 16, color: colors.ink }}>{item.otherUser.firstName}</Text>
                {item.lastMessageAt ? <Text style={{ color: colors.muted, fontSize: 12 }}>{relative(item.lastMessageAt)}</Text> : null}
              </View>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }} numberOfLines={1}>{item.route}</Text>
              <Text style={{ color: item.lastMessage ? colors.ink : colors.muted, marginTop: 2 }} numberOfLines={1}>{item.lastMessage ?? "Aucun message — dites bonjour !"}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

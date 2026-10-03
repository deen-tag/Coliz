import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState, ErrorState, Loading } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { api, errorMessage } from "@/lib/api";
import { colors } from "@/lib/theme";
import { timeShort, dateShort } from "@/lib/format";
import type { BookingDetail, ChatMessage } from "@/lib/types";

// Messagerie : rafraîchie toutes les 4 s tant que l'écran est ouvert (comme sur le site).
export default function Chat() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const booking = useApi<BookingDetail>(`/api/bookings/${bookingId}`, { reloadOnFocus: false });
  const { data, loading, error, reload, silentReload, setData } = useApi<ChatMessage[]>(`/api/messages`, { query: { bookingId }, pollMs: 4000 });
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const list = useRef<FlatList>(null);

  const other = booking.data && user ? (booking.data.senderId === user.id ? booking.data.traveler : booking.data.sender) : null;

  const count = data?.length ?? 0;
  useEffect(() => {
    if (count > 0) setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80);
  }, [count]);

  const send = useCallback(async () => {
    const content = text.trim();
    if (!content || sending || !user) return;
    setSending(true);
    setSendError(null);
    // Affichage immédiat (optimiste), remplacé par la vraie liste ensuite.
    const temp: ChatMessage = { id: `tmp-${Date.now()}`, authorId: user.id, content, createdAt: new Date().toISOString(), author: { id: user.id, firstName: user.firstName, avatarUrl: user.avatarUrl } };
    setData([...(data ?? []), temp]);
    setText("");
    try {
      await api("/api/messages", { method: "POST", body: { bookingId, content } });
      await silentReload();
    } catch (e) {
      setData((data ?? []).filter((m) => m.id !== temp.id));
      setText(content);
      setSendError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }, [text, sending, user, data, bookingId, setData, silentReload]);

  return (
    <>
      <Stack.Screen options={{ title: other?.firstName ?? "Messagerie", headerRight: () => (
        <Pressable onPress={() => router.push(`/booking/${bookingId}`)} hitSlop={12} accessibilityLabel="Voir la réservation"><Ionicons name="document-text-outline" size={24} color={colors.primary} /></Pressable>
      ) }} />
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}>
        {loading ? <Loading /> : error && !data ? <ErrorState message={error.message} network={error.isNetwork} onRetry={reload} /> : (
          <FlatList
            ref={list}
            data={data ?? []}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
            ListEmptyComponent={<EmptyState icon="chatbubble-outline" title="Commencez la conversation" text="Convenez du point de rendez-vous et des détails pratiques. Ne communiquez jamais vos codes par message." />}
            renderItem={({ item, index }) => {
              const mine = item.authorId === user?.id;
              const prev = data![index - 1];
              const newDay = !prev || dateShort(prev.createdAt) !== dateShort(item.createdAt);
              return (
                <View>
                  {newDay ? <Text style={{ textAlign: "center", color: colors.muted, fontSize: 12, marginVertical: 10 }}>{dateShort(item.createdAt)}</Text> : null}
                  <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%", backgroundColor: mine ? colors.primary : colors.surface, borderRadius: 18, borderBottomRightRadius: mine ? 4 : 18, borderBottomLeftRadius: mine ? 18 : 4, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 6, borderWidth: mine ? 0 : 1, borderColor: colors.line }}>
                    <Text selectable style={{ color: mine ? "#fff" : colors.ink, fontSize: 16, lineHeight: 22 }}>{item.content}</Text>
                    <Text style={{ color: mine ? "rgba(255,255,255,0.7)" : colors.muted, fontSize: 11, alignSelf: "flex-end", marginTop: 2 }}>{timeShort(item.createdAt)}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}
        {sendError ? <Text style={{ color: colors.error, paddingHorizontal: 16, paddingBottom: 6 }}>{sendError}</Text> : null}
        <View style={{ flexDirection: "row", alignItems: "flex-end", padding: 10, paddingBottom: Math.max(insets.bottom, 10), backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, gap: 8 }}>
          <TextInput value={text} onChangeText={setText} placeholder="Votre message…" placeholderTextColor="#9AA5AB" multiline maxLength={2000} style={{ flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: colors.bg, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 16, color: colors.ink }} />
          <Pressable onPress={send} disabled={!text.trim() || sending} accessibilityLabel="Envoyer" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? colors.primary : colors.line, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

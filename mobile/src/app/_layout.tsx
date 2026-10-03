import React, { useEffect } from "react";
import { Stack, router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { StripeProvider } from "@stripe/stripe-react-native";
import { View, Text } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";
import { IS_CONFIGURED, STRIPE_PUBLISHABLE_KEY } from "@/lib/config";
import { routeForNotification, setupAndroidChannel } from "@/lib/push";
import { OfflineBanner } from "@/components/OfflineBanner";
import { BiometricGate } from "@/components/BiometricGate";

function Shell() {
  const { ready, user } = useAuth();

  useEffect(() => {
    setupAndroidChannel().catch(() => {});
  }, []);

  // Tap sur une notification push -> ouvre directement la bonne page.
  useEffect(() => {
    if (!ready || !user) return;
    const open = (data: any) => {
      const target = routeForNotification(data);
      if (target) setTimeout(() => router.push(target as any), 50);
    };
    Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) open(r.notification.request.content.data);
    });
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data));
    return () => sub.remove();
  }, [ready, user]);

  if (!ready) return null; // l'écran de démarrage natif reste affiché

  if (!IS_CONFIGURED) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: 28 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: 10 }}>Configuration requise</Text>
        <Text style={{ fontSize: 16, color: colors.muted, lineHeight: 23 }}>
          Ouvrez le fichier « mobile/coliz.config.json » et remplacez « apiUrl » par l'adresse de votre site Coliz (par exemple https://coliz.vercel.app), puis relancez l'application.
        </Text>
      </View>
    );
  }

  return (
    <BiometricGate>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.ink, fontWeight: "700" },
          headerShadowVisible: false,
          headerBackTitle: "Retour",
          contentStyle: { backgroundColor: colors.bg },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="trip/[id]" options={{ title: "Trajet" }} />
        <Stack.Screen name="trip/new" options={{ title: "Proposer un trajet" }} />
        <Stack.Screen name="parcel/new" options={{ title: "Envoyer un colis" }} />
        <Stack.Screen name="parcel/[id]" options={{ title: "Trajets compatibles" }} />
        <Stack.Screen name="booking/[id]" options={{ title: "Réservation" }} />
        <Stack.Screen name="chat/[bookingId]" options={{ title: "Messagerie" }} />
        <Stack.Screen name="traveler/[id]" options={{ title: "Profil" }} />
        <Stack.Screen name="review/[bookingId]" options={{ title: "Donner un avis", presentation: "modal" }} />
        <Stack.Screen name="incident/[bookingId]" options={{ title: "Signaler un problème", presentation: "modal" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="settings" options={{ title: "Paramètres" }} />
        <Stack.Screen name="wallet" options={{ title: "Portefeuille" }} />
        <Stack.Screen name="+not-found" options={{ title: "Page introuvable" }} />
      </Stack>
    </BiometricGate>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY || "pk_test_missing"} urlScheme="coliz">
          <AuthProvider>
            <Shell />
          </AuthProvider>
        </StripeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

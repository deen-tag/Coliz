import React from "react";
import { Alert, View, Text } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { RequireAuth } from "@/components/RequireAuth";
import { Avatar, Badge, Button, Card, Divider, Row } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { colors } from "@/lib/theme";
import { eur } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

export default function Profile() {
  return (
    <RequireAuth title="Votre profil" text="Connectez-vous pour gérer votre compte, vos paiements et vos paramètres.">
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { user, signOut } = useAuth();
  const dash = useApi<Dashboard>("/api/dashboard");
  if (!user) return null;

  function confirmLogout() {
    Alert.alert("Se déconnecter ?", "Vous devrez vous reconnecter pour accéder à votre compte.", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: async () => { await signOut(); router.replace("/(tabs)"); } },
    ]);
  }

  const unread = dash.data?.unreadNotifications ?? 0;
  return (
    <Screen topInset refreshing={dash.refreshing} onRefresh={dash.refresh}>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Avatar name={`${user.firstName} ${user.lastName}`} uri={user.avatarUrl} size={88} />
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink, marginTop: 12 }}>{user.firstName} {user.lastName}</Text>
        <Text style={{ color: colors.muted, marginBottom: 8 }}>{user.email}</Text>
        {user.identityVerified ? <Badge label="Profil vérifié" tone="success" icon="shield-checkmark" /> : <Badge label="Identité non vérifiée" tone="warning" />}
      </View>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Row icon="wallet-outline" title="Portefeuille" subtitle={`Disponible : ${eur(dash.data?.walletAvailable ?? 0)}`} onPress={() => router.push("/wallet")} />
        <Divider />
        <Row icon="notifications-outline" title="Notifications" subtitle={unread > 0 ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est à jour"} onPress={() => router.push("/notifications")} />
        <Divider />
        <Row icon="star-outline" title="Mon profil public" subtitle="Avis et note reçus" onPress={() => router.push(`/traveler/${user.id}`)} />
        <Divider />
        <Row icon="time-outline" title="Historique" subtitle="Réservations terminées ou annulées" onPress={() => router.push("/(tabs)/activity")} />
      </Card>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Row icon="settings-outline" title="Paramètres" subtitle="Profil, sécurité, notifications" onPress={() => router.push("/settings")} />
      </Card>
      <Button title="Se déconnecter" variant="secondary" icon="log-out-outline" onPress={confirmLogout} style={{ marginTop: 8 }} />
      <Text style={{ textAlign: "center", color: colors.muted, fontSize: 12, marginTop: 18 }}>Coliz · Vos colis voyagent avec ceux qui voyagent</Text>
    </Screen>
  );
}

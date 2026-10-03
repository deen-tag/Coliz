import React, { useState } from "react";
import { Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Screen } from "@/components/Screen";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge, Button, Card, EmptyState, ErrorState, H2, InlineMessage, SkeletonList } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { api, errorMessage } from "@/lib/api";
import { colors } from "@/lib/theme";
import { dateShort, eur } from "@/lib/format";
import type { WalletData } from "@/lib/types";

type Connect = { connected: boolean; onboardingCompleted?: boolean; payoutsEnabled?: boolean };

export default function Wallet() {
  return <RequireAuth title="Portefeuille" text="Connectez-vous pour voir vos gains."><Inner /></RequireAuth>;
}

function Inner() {
  const wallet = useApi<WalletData>("/api/wallet");
  const connect = useApi<Connect>("/api/stripe/connect/onboarding");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onboard() {
    setBusy(true);
    setErr(null);
    try {
      const { url } = await api<{ url: string }>("/api/stripe/connect/onboarding", { method: "POST" });
      // Page sécurisée Stripe dans le navigateur intégré ; au retour on actualise le statut.
      await WebBrowser.openBrowserAsync(url);
      await connect.reload();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (wallet.loading) return <Screen><SkeletonList count={3} /></Screen>;
  if (wallet.error || !wallet.data) return <Screen scroll={false}><ErrorState message={wallet.error?.message ?? "Erreur"} network={wallet.error?.isNetwork} onRetry={wallet.reload} /></Screen>;
  const c = connect.data;
  const ready = c?.connected && c.onboardingCompleted && c.payoutsEnabled;

  return (
    <Screen refreshing={wallet.refreshing} onRefresh={() => { wallet.refresh(); connect.refresh(); }}>
      {err ? <InlineMessage text={err} /> : null}
      <Card style={{ backgroundColor: colors.traveler, borderColor: colors.traveler }}>
        <Text style={{ color: "rgba(255,255,255,0.85)" }}>Disponible</Text>
        <Text style={{ color: "#fff", fontSize: 34, fontWeight: "800" }}>{eur(wallet.data.availableAmount)}</Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 6 }}>En attente : {eur(wallet.data.pendingAmount)}</Text>
      </Card>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <H2>Compte de paiement</H2>
          <Badge label={ready ? "Actif" : c?.connected ? "À compléter" : "Non configuré"} tone={ready ? "success" : "warning"} />
        </View>
        <Text style={{ color: colors.muted, lineHeight: 20, marginBottom: 12 }}>Pour recevoir votre rémunération, configurez votre compte Stripe (identité et coordonnées bancaires). C'est sécurisé et ne prend que quelques minutes.</Text>
        {!ready ? <Button title={c?.connected ? "Terminer la configuration" : "Configurer mon compte"} variant="traveler" onPress={onboard} loading={busy} /> : null}
      </Card>
      <H2 style={{ marginVertical: 8 }}>Historique</H2>
      {wallet.data.transactions.length === 0 ? <EmptyState icon="receipt-outline" title="Aucun versement" text="Vos gains apparaîtront ici après chaque livraison confirmée." /> : wallet.data.transactions.map((t) => (
        <Card key={t.id}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><View><Text style={{ fontWeight: "600", color: colors.ink }}>{t.type === "PAYOUT" ? "Virement" : "Rémunération"}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{dateShort(t.createdAt)}</Text></View><Text style={{ fontWeight: "800", color: colors.success }}>+{eur(t.amount)}</Text></View></Card>
      ))}
    </Screen>
  );
}

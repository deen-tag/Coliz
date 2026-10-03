import React from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { Avatar, Badge, Card, EmptyState, ErrorState, H2, SkeletonList, Stars } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { colors } from "@/lib/theme";
import { dateShort, eur, modeInfo, shortCity } from "@/lib/format";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { PublicProfile } from "@/lib/types";

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: p, loading, error, reload, refresh, refreshing } = useApi<PublicProfile>(`/api/users/${id}`);
  if (loading) return <Screen><SkeletonList count={3} /></Screen>;
  if (error || !p) return <Screen scroll={false}><ErrorState message={error?.message ?? "Profil introuvable."} network={error?.isNetwork} onRetry={reload} /></Screen>;
  const v = p.verification;
  const verified = Boolean(v?.isFullyVerified);
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={{ alignItems: "center", marginBottom: 18 }}>
        <Avatar name={p.firstName} uri={p.avatarUrl} size={88} />
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink, marginTop: 10 }}>{p.firstName}</Text>
        {p.ratingCount > 0 ? <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}><Stars value={p.ratingAverage} size={16} /><Text style={{ color: colors.muted, marginLeft: 6 }}>{Number(p.ratingAverage).toFixed(1)} ({p.ratingCount} avis)</Text></View> : <Text style={{ color: colors.muted, marginTop: 4 }}>Pas encore d'avis</Text>}
        {verified ? <View style={{ marginTop: 8 }}><Badge label="Profil vérifié" tone="success" icon="shield-checkmark" /></View> : null}
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
        <Card style={{ flex: 1, alignItems: "center", marginBottom: 0 }}><Text style={{ fontSize: 24, fontWeight: "800", color: colors.primary }}>{p.completedTrips}</Text><Text style={{ color: colors.muted }}>livraison{p.completedTrips > 1 ? "s" : ""}</Text></Card>
        <Card style={{ flex: 1, alignItems: "center", marginBottom: 0 }}><Text style={{ fontSize: 16, fontWeight: "800", color: colors.primary, marginTop: 6 }}>{format(new Date(p.memberSince), "MMM yyyy", { locale: fr })}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>membre depuis</Text></Card>
      </View>
      {p.bio ? <Card><H2 style={{ marginBottom: 6 }}>À propos</H2><Text style={{ color: colors.ink, lineHeight: 22 }}>{p.bio}</Text></Card> : null}
      {p.upcomingTrips.length > 0 ? (
        <>
          <H2 style={{ marginVertical: 8 }}>Prochains trajets</H2>
          {p.upcomingTrips.map((t) => (
            <Card key={t.id} onPress={() => router.push(`/trip/${t.id}`)}>
              <Text style={{ fontWeight: "700", color: colors.ink }}>{shortCity(t.originLabel)} → {shortCity(t.destinationLabel)}</Text>
              <Text style={{ color: colors.muted, marginTop: 2 }}>{dateShort(t.departureAt)} · {modeInfo(t.mode).label} · {eur(t.totalAmount)}</Text>
            </Card>
          ))}
        </>
      ) : null}
      <H2 style={{ marginVertical: 8 }}>Avis</H2>
      {p.reviews.length === 0 ? <EmptyState icon="star-outline" title="Aucun avis" text="Les avis apparaissent après une livraison confirmée." /> : p.reviews.map((r, i) => (
        <Card key={i}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontWeight: "700", color: colors.ink }}>{r.author}</Text><Stars value={r.rating} /></View>{r.comment ? <Text style={{ color: colors.ink, marginTop: 6, lineHeight: 21 }}>{r.comment}</Text> : null}<Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>{dateShort(r.createdAt)}</Text></Card>
      ))}
    </Screen>
  );
}

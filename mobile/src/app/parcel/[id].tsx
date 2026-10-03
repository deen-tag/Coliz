import React, { useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, Segmented, SkeletonList, Body } from "@/components/ui";
import { TripCard } from "@/components/TripCard";
import { useApi } from "@/lib/hooks";
import { colors } from "@/lib/theme";
import type { TripResult } from "@/lib/types";

// Trajets compatibles avec un de vos colis (moteur de matching du backend : distance, date, capacité).
type Row = TripResult & { distanceOriginKm?: number; distanceDestinationKm?: number };

export default function ParcelMatches() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sort, setSort] = useState<"best_match" | "contribution" | "date">("best_match");
  const { data, loading, error, reload, refreshing, refresh } = useApi<Row[]>("/api/trips/search", { query: { parcelId: id, sortBy: sort } });

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Body muted style={{ marginBottom: 12 }}>Voici les voyageurs qui correspondent à votre colis. Choisissez-en un pour envoyer votre demande.</Body>
      <Segmented options={[{ key: "best_match", label: "Pertinence" }, { key: "contribution", label: "Prix" }, { key: "date", label: "Date" }]} value={sort} onChange={setSort} />
      {loading ? <SkeletonList /> : error ? <ErrorState message={error.message} network={error.isNetwork} onRetry={reload} /> : (data ?? []).length === 0 ? (
        <View style={{ minHeight: 340 }}>
          <EmptyState icon="hourglass-outline" title="Aucun trajet compatible pour l'instant" text="Votre colis reste visible : vous serez prévenu dès qu'un voyageur compatible publie un trajet." action={{ label: "Voir tous les trajets", onPress: () => router.push("/(tabs)/search") }} />
        </View>
      ) : (
        data!.map((t) => (
          <View key={t.tripId}>
            <TripCard trip={t} onPress={() => router.push({ pathname: "/trip/[id]", params: { id: t.tripId, parcelId: id } })} />
            {t.distanceOriginKm != null ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: -6, marginBottom: 12, marginLeft: 6 }}>À {t.distanceOriginKm} km du départ · {t.distanceDestinationKm} km de l'arrivée</Text> : null}
          </View>
        ))
      )}
    </Screen>
  );
}

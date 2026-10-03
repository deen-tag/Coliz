import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => setOffline(s.isConnected === false || s.isInternetReachable === false));
    return unsub;
  }, []);
  if (!offline) return null;
  return (
    <View style={{ backgroundColor: colors.ink, paddingTop: insets.top + 6, paddingBottom: 8, paddingHorizontal: 16 }} accessibilityLiveRegion="polite">
      <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600", fontSize: 13 }}>Pas de connexion Internet — certaines fonctions sont indisponibles.</Text>
    </View>
  );
}

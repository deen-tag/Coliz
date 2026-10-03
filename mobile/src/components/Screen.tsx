import React from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/lib/theme";

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  topInset?: boolean; // true pour les écrans sans barre de titre native (onglets)
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: React.ReactNode; // barre d'action collée en bas (au-dessus du clavier)
  style?: ViewStyle;
  bg?: string;
};

// Gère d'un coup : zones sûres (encoche iPhone / barre Android), clavier, tirer-pour-rafraîchir.
export function Screen({ children, scroll = true, topInset, padded = true, refreshing, onRefresh, footer, style, bg = colors.bg }: Props) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[padded && styles.padded, { paddingTop: (topInset ? insets.top : 0) + (padded ? 16 : 0), paddingBottom: 24 }, style]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingTop: topInset ? insets.top : 0 }, padded && styles.padded, style]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <StatusBar style="dark" />
      {body}
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: 16 },
  footer: { backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingHorizontal: 16, paddingTop: 12 },
});

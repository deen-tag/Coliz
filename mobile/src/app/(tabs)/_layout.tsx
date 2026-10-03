import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";

const icon = (active: any, inactive: any) => ({ color, focused }: { color: string; focused: boolean }) => <Ionicons name={focused ? active : inactive} size={24} color={color} />;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 56 + Math.max(insets.bottom, Platform.OS === "android" ? 8 : 0),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Accueil", tabBarIcon: icon("home", "home-outline") }} />
      <Tabs.Screen name="search" options={{ title: "Recherche", tabBarIcon: icon("search", "search-outline") }} />
      <Tabs.Screen name="activity" options={{ title: "Activité", tabBarIcon: icon("cube", "cube-outline") }} />
      <Tabs.Screen name="messages" options={{ title: "Messages", tabBarIcon: icon("chatbubbles", "chatbubbles-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Profil", tabBarIcon: icon("person", "person-outline") }} />
    </Tabs>
  );
}

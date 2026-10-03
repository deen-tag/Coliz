import React, { useRef, useState } from "react";
import { Animated, Dimensions, FlatList, Image, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Button } from "@/components/ui";
import { colors } from "@/lib/theme";
import { useAuth } from "@/lib/auth";

const { width } = Dimensions.get("window");
const SLIDES = [
  { icon: "cube-outline" as const, title: "Vos colis voyagent avec ceux qui voyagent", text: "Coliz met en relation des expéditeurs et des voyageurs qui font déjà la route." },
  { icon: "shield-checkmark-outline" as const, title: "Paiement et remise sécurisés", text: "Votre argent n'est versé qu'à la livraison, confirmée par un code que vous seul détenez." },
  { icon: "chatbubbles-outline" as const, title: "Échangez en direct", text: "Messagerie, notifications et suivi de colis : tout est dans votre poche." },
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { updatePrefs } = useAuth();
  const [index, setIndex] = useState(0);
  const x = useRef(new Animated.Value(0)).current;

  async function go(path: "/(auth)/login" | "/(auth)/register" | "/(tabs)") {
    await updatePrefs({ onboardingDone: true });
    router.replace(path);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.primary }}>
      <StatusBar style="light" />
      <View style={{ alignItems: "center", paddingTop: insets.top + 24 }}>
        <Image source={require("../../assets/splash-icon.png")} style={{ width: 120, height: 120 }} resizeMode="contain" />
        <Text style={{ color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: 0.5 }}>Coliz</Text>
      </View>
      <Animated.FlatList
        data={SLIDES}
        keyExtractor={(s) => s.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flexGrow: 0, marginTop: 24 }}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: 32, alignItems: "center" }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Ionicons name={item.icon} size={30} color="#fff" />
            </View>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center" }}>{item.title}</Text>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, textAlign: "center", marginTop: 10, lineHeight: 23 }}>{item.text}</Text>
          </View>
        )}
      />
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 18 }}>
        {SLIDES.map((_, i) => (
          <Animated.View
            key={i}
            style={{
              height: 8,
              borderRadius: 4,
              marginHorizontal: 4,
              backgroundColor: "#fff",
              width: x.interpolate({ inputRange: [(i - 1) * width, i * width, (i + 1) * width], outputRange: [8, 24, 8], extrapolate: "clamp" }),
              opacity: i === index ? 1 : 0.5,
            }}
          />
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16 }}>
        <Button title="Créer un compte" variant="secondary" onPress={() => go("/(auth)/register")} style={{ borderColor: "#fff" }} />
        <Button title="J'ai déjà un compte" variant="onDark" onPress={() => go("/(auth)/login")} style={{ marginTop: 8 }} />
        <Button title="Explorer sans compte" variant="onDark" onPress={() => go("/(tabs)")} />
      </View>
    </View>
  );
}

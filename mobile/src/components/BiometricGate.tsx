import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Image, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";
import { Button } from "./ui";

const LOCK_AFTER_MS = 60_000; // verrouille si l'app reste plus d'une minute en arrière-plan

// Verrouillage facultatif (Face ID / Touch ID / empreinte) activable dans Paramètres.
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const { user, prefs, signOut } = useAuth();
  const enabled = Boolean(user && prefs.biometricLock);
  const [locked, setLocked] = useState(enabled);
  const leftAt = useRef<number | null>(null);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Déverrouiller Coliz",
        cancelLabel: "Annuler",
        fallbackLabel: "Code du téléphone",
      });
      if (res.success) setLocked(false);
    } finally {
      prompting.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLocked(false);
      return;
    }
    setLocked(true);
    unlock();
  }, [enabled, unlock]);

  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") leftAt.current = Date.now();
      if (state === "active" && leftAt.current && Date.now() - leftAt.current > LOCK_AFTER_MS) {
        setLocked(true);
        unlock();
      }
    });
    return () => sub.remove();
  }, [enabled, unlock]);

  if (!enabled || !locked) return <>{children}</>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Image source={require("../../assets/splash-icon.png")} style={{ width: 140, height: 140 }} resizeMode="contain" />
      <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 12, marginBottom: 24 }}>Coliz est verrouillé</Text>
      <Button title="Déverrouiller" variant="secondary" icon="lock-open-outline" onPress={unlock} style={{ alignSelf: "stretch" }} />
      <Button title="Se déconnecter" variant="secondary" onPress={() => signOut()} style={{ marginTop: 10, alignSelf: "stretch" }} />
    </View>
  );
}

import React, { useRef, useState } from "react";
import { Image, Text, TextInput, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Button, H1, Input, InlineMessage, Body } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/api";
import { colors } from "@/lib/theme";

export default function Login() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  async function submit() {
    if (!email.trim() || !password) return setError("Saisissez votre email et votre mot de passe.");
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      // On n'accepte que des chemins internes de l'app pour la redirection.
      router.replace(next && next.startsWith("/") ? (next as any) : "/(tabs)");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Image source={require("../../../assets/icon.png")} style={{ width: 72, height: 72, borderRadius: 18 }} />
      </View>
      <H1 style={{ marginBottom: 6 }}>Bon retour !</H1>
      <Body muted style={{ marginBottom: 22 }}>Connectez-vous pour réserver, discuter et suivre vos colis.</Body>
      {error ? <InlineMessage text={error} /> : null}
      <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} placeholder="vous@exemple.com" />
      <Input ref={passwordRef} label="Mot de passe" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} placeholder="Votre mot de passe" />
      <Link href="/(auth)/forgot-password" style={{ color: colors.primary, fontWeight: "600", marginBottom: 20, alignSelf: "flex-end", paddingVertical: 6 }}>
        Mot de passe oublié ?
      </Link>
      <Button title="Se connecter" onPress={submit} loading={loading} />
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 22 }}>
        <Text style={{ color: colors.muted }}>Pas encore de compte ? </Text>
        <Link href={{ pathname: "/(auth)/register", params: next ? { next } : {} }} style={{ color: colors.primary, fontWeight: "700" }}>
          S'inscrire
        </Link>
      </View>
      <Button title="Continuer sans compte" variant="ghost" onPress={() => router.replace("/(tabs)")} style={{ marginTop: 10 }} />
    </Screen>
  );
}

import React, { useState } from "react";
import { Text, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Button, H1, Input, InlineMessage, Body } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/api";
import { colors } from "@/lib/theme";

export default function Register() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { signUp } = useAuth();
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit() {
    if (!f.firstName.trim() || !f.lastName.trim()) return setError("Indiquez votre prénom et votre nom.");
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setError("Cette adresse email semble invalide.");
    if (f.password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (f.password !== f.confirm) return setError("Les deux mots de passe ne sont pas identiques.");
    setError(null);
    setLoading(true);
    try {
      await signUp({ email: f.email, password: f.password, firstName: f.firstName.trim(), lastName: f.lastName.trim() });
      router.replace(next && next.startsWith("/") ? (next as any) : "/(tabs)");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <H1 style={{ marginBottom: 6 }}>Créer un compte</H1>
      <Body muted style={{ marginBottom: 22 }}>Quelques secondes pour rejoindre Coliz.</Body>
      {error ? <InlineMessage text={error} /> : null}
      <Input label="Prénom" value={f.firstName} onChangeText={set("firstName")} autoComplete="given-name" textContentType="givenName" returnKeyType="next" />
      <Input label="Nom" value={f.lastName} onChangeText={set("lastName")} autoComplete="family-name" textContentType="familyName" returnKeyType="next" />
      <Input label="Email" icon="mail-outline" value={f.email} onChangeText={set("email")} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" returnKeyType="next" />
      <Input label="Mot de passe" icon="lock-closed-outline" value={f.password} onChangeText={set("password")} secureTextEntry hint="8 caractères minimum" textContentType="newPassword" returnKeyType="next" />
      <Input label="Confirmer le mot de passe" icon="lock-closed-outline" value={f.confirm} onChangeText={set("confirm")} secureTextEntry textContentType="newPassword" returnKeyType="go" onSubmitEditing={submit} />
      <Button title="Créer mon compte" onPress={submit} loading={loading} style={{ marginTop: 6 }} />
      <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 14, lineHeight: 17 }}>
        En créant un compte, vous acceptez les conditions d'utilisation de Coliz. Coliz est un intermédiaire : il ne transporte pas les colis lui-même.
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20 }}>
        <Text style={{ color: colors.muted }}>Déjà inscrit ? </Text>
        <Link href={{ pathname: "/(auth)/login", params: next ? { next } : {} }} style={{ color: colors.primary, fontWeight: "700" }}>
          Se connecter
        </Link>
      </View>
    </Screen>
  );
}

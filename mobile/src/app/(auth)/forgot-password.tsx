import React, { useState } from "react";
import { router } from "expo-router";
import { Button, H1, Input, InlineMessage, Body } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { api, errorMessage } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Saisissez une adresse email valide.");
    setError(null);
    setLoading(true);
    try {
      await api("/api/auth/forgot-password", { method: "POST", body: { email: email.trim() }, auth: false });
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <H1 style={{ marginBottom: 6 }}>Mot de passe oublié</H1>
      <Body muted style={{ marginBottom: 22 }}>Indiquez votre email : nous vous envoyons un lien pour choisir un nouveau mot de passe.</Body>
      {sent ? (
        <>
          <InlineMessage tone="success" text="Si un compte existe avec cette adresse, un email vient d'être envoyé. Ouvrez-le et touchez le lien (pensez à vérifier vos courriers indésirables). Le lien est valable pour une durée limitée." />
          <Button title="Retour à la connexion" onPress={() => router.replace("/(auth)/login")} />
        </>
      ) : (
        <>
          {error ? <InlineMessage text={error} /> : null}
          <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" returnKeyType="send" onSubmitEditing={submit} />
          <Button title="Envoyer le lien" onPress={submit} loading={loading} />
        </>
      )}
    </Screen>
  );
}

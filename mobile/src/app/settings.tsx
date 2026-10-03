import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { Screen } from "@/components/Screen";
import { RequireAuth } from "@/components/RequireAuth";
import { Avatar, Badge, Button, Card, Divider, ErrorState, H2, InlineMessage, Input, Row, SkeletonList } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { api, errorMessage } from "@/lib/api";
import { pickPhoto, uploadImage } from "@/lib/photos";
import { API_URL } from "@/lib/config";
import { colors } from "@/lib/theme";
import type { SettingsData } from "@/lib/types";

export default function Settings() {
  return <RequireAuth title="Paramètres" text="Connectez-vous pour gérer votre compte."><Inner /></RequireAuth>;
}

function Inner() {
  const { prefs, updatePrefs, signOut, refreshUser } = useAuth();
  const { data, loading, error, reload, setData } = useApi<SettingsData>("/api/settings", { reloadOnFocus: false });
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    if (data) setForm({ firstName: data.firstName, lastName: data.lastName, phone: data.phone ?? "", bio: data.bio ?? "" });
  }, [data?.firstName, data?.lastName, data?.phone, data?.bio]);

  useEffect(() => {
    (async () => setBioAvailable((await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync())))();
  }, []);

  if (loading) return <Screen><SkeletonList count={4} /></Screen>;
  if (error || !data) return <Screen scroll={false}><ErrorState message={error?.message ?? "Erreur"} network={error?.isNetwork} onRetry={reload} /></Screen>;

  async function patch(body: Partial<SettingsData>) {
    setData({ ...data!, ...body });
    try {
      await api("/api/settings", { method: "PATCH", body });
    } catch (e) {
      setData(data);
      setMsg({ tone: "error", text: errorMessage(e) });
    }
  }

  async function saveProfile() {
    if (!form.firstName.trim() || !form.lastName.trim()) return setMsg({ tone: "error", text: "Le prénom et le nom sont obligatoires." });
    setSaving(true);
    setMsg(null);
    try {
      await api("/api/settings", { method: "PATCH", body: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.trim(), bio: form.bio.trim() } });
      setMsg({ tone: "success", text: "Profil enregistré." });
      await refreshUser();
    } catch (e) {
      setMsg({ tone: "error", text: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  }

  function changePhoto() {
    const apply = async (src: "camera" | "library") => {
      const uri = await pickPhoto(src);
      if (!uri) return;
      try {
        const avatarUrl = await uploadImage("/api/avatar", uri);
        setData({ ...data!, avatarUrl });
        await refreshUser();
      } catch (e) {
        setMsg({ tone: "error", text: errorMessage(e) });
      }
    };
    Alert.alert("Photo de profil", undefined, [
      { text: "Prendre un selfie", onPress: () => apply("camera") },
      { text: "Choisir dans la galerie", onPress: () => apply("library") },
      ...(data!.avatarUrl ? [{ text: "Supprimer la photo", style: "destructive" as const, onPress: async () => { await api("/api/avatar", { method: "DELETE" }).catch(() => {}); setData({ ...data!, avatarUrl: null }); await refreshUser(); } }] : []),
      { text: "Annuler", style: "cancel" as const },
    ]);
  }

  async function toggleBio(on: boolean) {
    if (on) {
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Activer le verrouillage" });
      if (!r.success) return;
    }
    await updatePrefs({ biometricLock: on });
  }

  async function startIdentity() {
    try {
      const { url } = await api<{ url: string }>("/api/stripe/identity/session", { method: "POST" });
      await WebBrowser.openBrowserAsync(url);
      await reload();
    } catch (e) {
      setMsg({ tone: "error", text: errorMessage(e) });
    }
  }

  function deleteAccount() {
    Alert.alert("Supprimer votre compte ?", "Votre compte sera désactivé et vos informations personnelles effacées. Les réservations et paiements passés sont conservés (obligations légales). Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        try {
          await api("/api/settings/delete-account", { method: "POST" });
          await signOut();
          router.replace("/(tabs)");
        } catch (e) { setMsg({ tone: "error", text: errorMessage(e) }); }
      } },
    ]);
  }

  const v = data.verification;
  const set = (k: keyof typeof form) => (t: string) => setForm((f) => ({ ...f, [k]: t }));

  return (
    <Screen>
      {msg ? <InlineMessage tone={msg.tone} text={msg.text} /> : null}
      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <Pressable onPress={changePhoto} accessibilityRole="button" accessibilityLabel="Changer la photo de profil">
          <Avatar name={`${data.firstName} ${data.lastName}`} uri={data.avatarUrl} size={92} />
        </Pressable>
        <Button title="Changer la photo" variant="ghost" small onPress={changePhoto} />
      </View>

      <H2 style={{ marginBottom: 10 }}>Profil</H2>
      <Input label="Prénom" value={form.firstName} onChangeText={set("firstName")} />
      <Input label="Nom" value={form.lastName} onChangeText={set("lastName")} />
      <Input label="Téléphone" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" textContentType="telephoneNumber" />
      <Input label="À propos de vous" value={form.bio} onChangeText={set("bio")} multiline maxLength={500} />
      <Button title="Enregistrer" onPress={saveProfile} loading={saving} style={{ marginBottom: 20 }} />

      <H2 style={{ marginBottom: 10 }}>Vérifications</H2>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Row icon="mail-outline" title="Email" subtitle={data.email} right={<Badge label={v.email ? "Vérifié" : "Non vérifié"} tone={v.email ? "success" : "neutral"} />} />
        <Divider />
        <Row icon="call-outline" title="Téléphone" right={<Badge label={v.phone ? "Vérifié" : "Non vérifié"} tone={v.phone ? "success" : "neutral"} />} />
        <Divider />
        <Row icon="id-card-outline" title="Pièce d'identité" subtitle={v.identity ? undefined : "Rassure les autres utilisateurs"} onPress={v.identity ? undefined : startIdentity} right={v.identity ? <Badge label="Vérifiée" tone="success" /> : undefined} />
      </Card>

      <H2 style={{ marginVertical: 10 }}>Notifications</H2>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Row title="Notifications push" subtitle="Alertes sur votre téléphone" right={<Switch value={data.notifyPush} onValueChange={(x) => patch({ notifyPush: x })} trackColor={{ true: colors.primary }} />} />
        <Divider />
        <Row title="Emails" subtitle="Demandes, paiements, livraisons" right={<Switch value={data.notifyEmail} onValueChange={(x) => patch({ notifyEmail: x })} trackColor={{ true: colors.primary }} />} />
        <Divider />
        <Row icon="settings-outline" title="Réglages du téléphone" subtitle="Autorisations (notifications, caméra, position)" onPress={() => Linking.openSettings()} />
      </Card>

      <H2 style={{ marginVertical: 10 }}>Sécurité</H2>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Row icon="finger-print-outline" title="Verrouillage biométrique" subtitle={bioAvailable ? "Face ID / empreinte à l'ouverture" : "Non disponible sur cet appareil"} right={<Switch value={prefs.biometricLock} disabled={!bioAvailable} onValueChange={toggleBio} trackColor={{ true: colors.primary }} />} />
        <Divider />
        <Row icon="key-outline" title="Changer de mot de passe" subtitle="Recevoir un lien par email" onPress={() => { Alert.alert("Changer de mot de passe", `Un lien sera envoyé à ${data.email}.`, [{ text: "Annuler", style: "cancel" }, { text: "Envoyer", onPress: async () => { try { await api("/api/auth/forgot-password", { method: "POST", body: { email: data.email }, auth: false }); setMsg({ tone: "success", text: "Email envoyé. Après changement, vous devrez vous reconnecter." }); } catch (e) { setMsg({ tone: "error", text: errorMessage(e) }); } } }]); }} />
      </Card>

      <H2 style={{ marginVertical: 10 }}>À propos</H2>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Row icon="document-text-outline" title="Conditions et confidentialité" onPress={() => WebBrowser.openBrowserAsync(API_URL)} />
        <Divider />
        <Row title="Version" right={<Text style={{ color: colors.muted }}>{Constants.expoConfig?.version ?? "1.0.0"}</Text>} />
      </Card>

      <Button title="Supprimer mon compte" variant="ghost" onPress={deleteAccount} style={{ marginTop: 12 }} />
    </Screen>
  );
}

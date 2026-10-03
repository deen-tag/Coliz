import React, { useState } from "react";
import { Alert, Modal, Pressable, Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { PaymentSheetError, useStripe } from "@stripe/stripe-react-native";
import { Screen } from "@/components/Screen";
import { StatusBanner } from "@/components/StatusBanner";
import { Timeline } from "@/components/Timeline";
import { RouteMap } from "@/components/RouteMap";
import { Avatar, Badge, Button, Card, ErrorState, H2, InlineMessage, Input, SkeletonList } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { api, errorMessage } from "@/lib/api";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/config";
import { bookingStatusInfo, trackingTimeline } from "@/lib/booking-status";
import { colors, radius } from "@/lib/theme";
import { dateLong, eur, modeInfo, shortCity, timeShort } from "@/lib/format";
import type { BookingDetail } from "@/lib/types";

const CANCELLABLE = ["REQUESTED", "ACCEPTED", "PAYMENT_PENDING", "CONFIRMED"];

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { data: b, loading, error, reload, refresh, refreshing, silentReload } = useApi<BookingDetail>(`/api/bookings/${id}`, { pollMs: 10000 });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "error" | "success" | "info"; text: string } | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);

  if (loading) return <Screen><SkeletonList count={3} /></Screen>;
  if (error || !b || !user) return <Screen scroll={false}><ErrorState message={error?.message ?? "Réservation introuvable."} network={error?.isNetwork} onRetry={reload} /></Screen>;

  const role = b.senderId === user.id ? "sender" : "traveler";
  const other = role === "sender" ? b.traveler : b.sender;
  const info = bookingStatusInfo(b.status, role, other.firstName);
  const timeline = trackingTimeline(b.status);
  const mode = modeInfo(b.trip.mode);
  const isSender = role === "sender";

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setMsg({ tone: "error", text: errorMessage(e) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setBusy(null);
    }
  }

  const post = (path: string, body?: unknown) => api(`/api/bookings/${id}/${path}`, { method: "POST", body });

  const accept = () => run("accept", async () => { await post("accept"); await silentReload(); });
  const refuse = () =>
    Alert.alert("Refuser cette demande ?", "L'expéditeur sera prévenu.", [
      { text: "Annuler", style: "cancel" },
      { text: "Refuser", style: "destructive", onPress: () => run("refuse", async () => { await post("refuse"); await silentReload(); }) },
    ]);

  const cancel = () =>
    Alert.alert(
      "Annuler la réservation ?",
      b.status === "CONFIRMED" ? "Cette réservation est payée : le remboursement dépend du délai avant le départ (100 % à plus de 48 h, 50 % entre 24 et 48 h, 0 % en dessous)." : "Aucun paiement n'a été effectué.",
      [
        { text: "Garder", style: "cancel" },
        {
          text: "Annuler la réservation",
          style: "destructive",
          onPress: () =>
            run("cancel", async () => {
              const r = await api<{ refundRate: number | null; refundAmount?: number }>(`/api/bookings/${id}/cancel`, { method: "POST" });
              if (r.refundAmount) setMsg({ tone: "success", text: `Réservation annulée. Remboursement de ${eur(r.refundAmount)} en cours.` });
              else setMsg({ tone: "info", text: "Réservation annulée." });
              await silentReload();
            }),
        },
      ]
    );

  // Paiement : le serveur crée le PaymentIntent (clé secrète côté serveur uniquement), l'app affiche la feuille de paiement Stripe.
  const pay = () =>
    run("pay", async () => {
      if (!STRIPE_PUBLISHABLE_KEY || STRIPE_PUBLISHABLE_KEY.includes("REMPLACEZ")) throw new Error("La clé Stripe n'est pas configurée dans l'application.");
      const { clientSecret } = await api<{ clientSecret: string }>(`/api/bookings/${id}/pay`, { method: "POST" });
      const init = await initPaymentSheet({
        merchantDisplayName: "Coliz",
        paymentIntentClientSecret: clientSecret,
        returnURL: "coliz://stripe-redirect",
        defaultBillingDetails: { email: user.email, name: `${user.firstName} ${user.lastName}` },
        appearance: { colors: { primary: colors.primary } },
      });
      if (init.error) throw new Error(init.error.message);
      const res = await presentPaymentSheet();
      if (res.error) {
        if (res.error.code === PaymentSheetError.Canceled) return;
        throw new Error(res.error.message);
      }
      // Le webhook Stripe confirme la réservation côté serveur : on attend ce changement quelques secondes.
      setMsg({ tone: "info", text: "Paiement reçu, confirmation en cours…" });
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const fresh = await api<BookingDetail>(`/api/bookings/${id}`);
        if (fresh.status === "CONFIRMED") break;
      }
      setMsg({ tone: "success", text: "Paiement confirmé ! Vos codes de remise et de réception sont disponibles ci-dessous." });
      await silentReload();
    });

  const showCodes = isSender && ["CONFIRMED", "PICKED_UP"].includes(b.status);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {msg ? <InlineMessage tone={msg.tone} text={msg.text} /> : null}
      <StatusBanner info={info} />

      {/* ── Actions selon le statut et le rôle ── */}
      {!isSender && b.status === "REQUESTED" ? (
        <View style={{ gap: 10, marginBottom: 14 }}>
          <Button title="Accepter la demande" icon="checkmark" variant="traveler" onPress={accept} loading={busy === "accept"} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button title="Proposer un prix" variant="secondary" style={{ flex: 1 }} onPress={() => setPriceOpen(true)} />
            <Button title="Refuser" variant="secondary" style={{ flex: 1 }} onPress={refuse} loading={busy === "refuse"} />
          </View>
        </View>
      ) : null}
      {isSender && ["ACCEPTED", "PAYMENT_PENDING"].includes(b.status) ? (
        <View style={{ gap: 10, marginBottom: 14 }}>
          <Button title={`Payer ${eur(b.totalAmount)}`} icon="card-outline" onPress={pay} loading={busy === "pay"} />
          <Button title="Proposer un autre prix" variant="secondary" onPress={() => setPriceOpen(true)} />
        </View>
      ) : null}
      {isSender && b.status === "REQUESTED" ? <Button title="Proposer un autre prix" variant="secondary" onPress={() => setPriceOpen(true)} style={{ marginBottom: 14 }} /> : null}

      {showCodes && b.status === "CONFIRMED" ? (
        <CodeCard bookingId={b.id} kind="pickup" title="Code de remise" help={`À donner en main propre à ${other.firstName} au moment de lui confier le colis.`} />
      ) : null}
      {showCodes ? (
        <CodeCard bookingId={b.id} kind="delivery" title="Code de réception" help="À transmettre à la personne qui réceptionnera le colis à l'arrivée. Ne le donnez à personne d'autre." shareable />
      ) : null}

      {!isSender && b.status === "CONFIRMED" ? (
        <CodeEntry title="Prise en charge du colis" help={`Récupérez le colis auprès de ${other.firstName}, puis saisissez le code de remise qu'il vous donne.`} cta="Confirmer la prise en charge" onSubmit={async (code) => { await post("pickup-code/verify", { code }); await silentReload(); }} />
      ) : null}
      {!isSender && b.status === "PICKED_UP" ? (
        <>
          <CodeEntry title="Livraison du colis" help="À l'arrivée, demandez le code de réception à la personne qui reçoit le colis et saisissez-le : vous serez alors rémunéré." cta="Confirmer la livraison" onSubmit={async (code) => { await post("delivery-code/verify", { code }); await silentReload(); }} />
          <Button
            title="Personne pour réceptionner le colis"
            variant="ghost"
            onPress={() => Alert.alert("Signaler un problème de livraison ?", "Un incident sera ouvert et le colis reste sous votre garde en attendant.", [
              { text: "Annuler", style: "cancel" },
              { text: "Signaler", style: "destructive", onPress: () => run("issue", async () => { await post("delivery/report-issue", {}); await silentReload(); }) },
            ])}
            loading={busy === "issue"}
          />
        </>
      ) : null}
      {b.status === "COMPLETED" ? <Button title="Donner mon avis" icon="star-outline" variant={isSender ? "primary" : "traveler"} onPress={() => router.push(`/review/${b.id}`)} style={{ marginBottom: 14 }} /> : null}

      {/* ── Suivi ── */}
      {timeline ? (
        <Card>
          <H2 style={{ marginBottom: 12 }}>Suivi du colis</H2>
          <Timeline data={timeline} />
        </Card>
      ) : null}

      {/* ── Trajet ── */}
      <Card onPress={() => router.push(`/trip/${b.tripId}`)}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <H2>Trajet</H2>
          <Badge label={mode.label} tone="traveler" />
        </View>
        <Text style={{ fontSize: 17, fontWeight: "700", color: colors.ink }}>{shortCity(b.trip.originLabel)} → {shortCity(b.trip.destinationLabel)}</Text>
        <Text style={{ color: colors.muted, marginTop: 3 }}>{dateLong(b.trip.departureAt)} · {timeShort(b.trip.departureAt)}</Text>
        {b.trip.pickupPointLabel ? <Text style={{ color: colors.ink, marginTop: 8 }}>Remise : {b.trip.pickupPointLabel}</Text> : null}
        {b.trip.dropoffPointLabel ? <Text style={{ color: colors.ink, marginTop: 2 }}>Livraison : {b.trip.dropoffPointLabel}</Text> : null}
      </Card>
      <RouteMap origin={{ label: b.parcel.originLabel, lat: b.parcel.originLat, lng: b.parcel.originLng }} destination={{ label: b.parcel.destinationLabel, lat: b.parcel.destinationLat, lng: b.parcel.destinationLng }} height={160} />

      {/* ── Interlocuteur ── */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable onPress={() => router.push(`/traveler/${other.id}`)} style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Avatar name={other.firstName} uri={other.avatarUrl} size={48} />
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontWeight: "700", fontSize: 16, color: colors.ink }}>{other.firstName}</Text>
              <Text style={{ color: colors.muted }}>{isSender ? "Voyageur" : "Expéditeur"}{other.identityVerifiedAt ? " · vérifié" : ""}</Text>
            </View>
          </Pressable>
          <Button title="Écrire" small icon="chatbubble-outline" variant={isSender ? "primary" : "traveler"} onPress={() => router.push(`/chat/${b.id}`)} />
        </View>
      </Card>

      {/* ── Montants ── */}
      <Card>
        <H2 style={{ marginBottom: 10 }}>{isSender ? "Paiement" : "Votre rémunération"}</H2>
        {isSender ? (
          <>
            <Line label="Part du voyageur" value={eur(b.contributionAmount)} />
            <Line label="Frais de service Coliz" value={eur(b.platformFeeAmount)} />
            <Line label="Total" value={eur(b.totalAmount)} bold />
          </>
        ) : (
          <Line label="Vous recevez" value={eur(b.contributionAmount)} bold />
        )}
        {b.negotiatedAmount ? <Text style={{ color: colors.muted, marginTop: 8, fontSize: 13 }}>Prix négocié par rapport au tarif initial du trajet.</Text> : null}
      </Card>

      <Card>
        <H2 style={{ marginBottom: 10 }}>Colis</H2>
        <Line label="Poids" value={`${b.parcel.weightKg} kg`} />
        <Line label="Nombre" value={String(b.parcel.parcelCount)} />
        <Line label="Valeur déclarée" value={eur(b.parcel.declaredValue)} />
      </Card>

      <View style={{ gap: 4, marginTop: 4 }}>
        {["CONFIRMED", "PICKED_UP", "DELIVERY_FAILED", "DELIVERED", "COMPLETED"].includes(b.status) ? (
          <Button title="Signaler un problème" variant="ghost" icon="alert-circle-outline" onPress={() => router.push(`/incident/${b.id}`)} />
        ) : null}
        {CANCELLABLE.includes(b.status) ? <Button title="Annuler la réservation" variant="ghost" onPress={cancel} loading={busy === "cancel"} style={{ opacity: 0.9 }} /> : null}
      </View>

      <PriceModal
        visible={priceOpen}
        initial={String(Number(b.contributionAmount))}
        onClose={() => setPriceOpen(false)}
        onSubmit={async (amount) => {
          await post("negotiate", { amount });
          setPriceOpen(false);
          setMsg({ tone: "success", text: "Nouveau prix proposé. L'autre personne est prévenue." });
          await silentReload();
        }}
      />
    </Screen>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ color: bold ? colors.ink : colors.muted, fontWeight: bold ? "700" : "400" }}>{label}</Text>
      <Text style={{ color: colors.ink, fontWeight: bold ? "800" : "600" }}>{value}</Text>
    </View>
  );
}

// Code à 6 chiffres que l'expéditeur consulte (et peut régénérer s'il a expiré).
function CodeCard({ bookingId, kind, title, help, shareable }: { bookingId: string; kind: "pickup" | "delivery"; title: string; help: string; shareable?: boolean }) {
  const path = `/api/bookings/${bookingId}/${kind}-code`;
  const { data, loading, reload } = useApi<{ code: string | null; expiresAt?: string }>(path, { reloadOnFocus: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function regenerate() {
    setBusy(true);
    setErr(null);
    try {
      await api(path, { method: "POST" });
      await reload();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ borderColor: colors.primary, borderWidth: 1.5 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
        <Ionicons name="key-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
        <H2>{title}</H2>
      </View>
      {loading ? <Text style={{ color: colors.muted }}>Chargement…</Text> : data?.code ? (
        <Text selectable style={{ fontSize: 38, fontWeight: "800", letterSpacing: 8, color: colors.primary, textAlign: "center", marginVertical: 8 }}>{data.code}</Text>
      ) : (
        <>
          <Text style={{ color: colors.muted, marginBottom: 10 }}>Ce code a expiré ou a été verrouillé après trop de tentatives.</Text>
          <Button title="Générer un nouveau code" variant="secondary" onPress={regenerate} loading={busy} />
        </>
      )}
      <Text style={{ color: colors.muted, lineHeight: 20, marginTop: 4 }}>{help}</Text>
      {err ? <Text style={{ color: colors.error, marginTop: 6 }}>{err}</Text> : null}
      {shareable && data?.code ? <Button title="Envoyer le code au réceptionniste" small variant="secondary" icon="share-outline" style={{ marginTop: 12 }} onPress={() => Share.share({ message: `Voici le code de réception de mon colis Coliz : ${data.code}. Donnez-le au voyageur uniquement à la remise du colis.` }).catch(() => {})} /> : null}
    </Card>
  );
}

// Saisie du code par le voyageur.
function CodeEntry({ title, help, cta, onSubmit }: { title: string; help: string; cta: string; onSubmit: (code: string) => Promise<void> }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit() {
    if (code.length < 6) return setErr("Le code comporte 6 chiffres.");
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(code);
      setCode("");
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card style={{ borderColor: colors.traveler, borderWidth: 1.5 }}>
      <H2 style={{ marginBottom: 6 }}>{title}</H2>
      <Text style={{ color: colors.muted, lineHeight: 20, marginBottom: 12 }}>{help}</Text>
      <Input value={code} onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" placeholder="000000" maxLength={6} style={{ fontSize: 26, letterSpacing: 8, textAlign: "center", fontWeight: "700" }} error={err} textContentType="oneTimeCode" />
      <Button title={cta} variant="traveler" onPress={submit} loading={busy} disabled={code.length < 6} />
    </Card>
  );
}

function PriceModal({ visible, initial, onClose, onSubmit }: { visible: boolean; initial: string; onClose: () => void; onSubmit: (amount: number) => Promise<void> }) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit() {
    const n = Number(v.replace(",", "."));
    if (!(n > 0)) return setErr("Saisissez un montant supérieur à 0.");
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(n);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 20 }} onPress={onClose}>
        <Pressable style={{ backgroundColor: colors.surface, borderRadius: radius.block, padding: 20 }} onPress={() => {}}>
          <H2 style={{ marginBottom: 6 }}>Proposer un prix</H2>
          <Text style={{ color: colors.muted, marginBottom: 14, lineHeight: 20 }}>Montant destiné au voyageur, avant les frais de service Coliz. Il s'applique immédiatement (avant paiement uniquement).</Text>
          <Input value={v} onChangeText={setV} keyboardType="decimal-pad" label="Montant (€)" error={err} autoFocus />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button title="Annuler" variant="secondary" style={{ flex: 1 }} onPress={onClose} />
            <Button title="Proposer" style={{ flex: 1 }} onPress={submit} loading={busy} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

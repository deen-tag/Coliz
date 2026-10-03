import React, { forwardRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, radius, shadow, TOUCH } from "@/lib/theme";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

// ───────────── Boutons ─────────────
type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "traveler" | "danger" | "ghost" | "onDark";
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = "primary", loading, disabled, icon, small, style }: ButtonProps) {
  const palette = {
    primary: { bg: colors.primary, fg: "#fff", border: colors.primary },
    traveler: { bg: colors.traveler, fg: "#fff", border: colors.traveler },
    danger: { bg: colors.error, fg: "#fff", border: colors.error },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.primary },
    ghost: { bg: "transparent", fg: colors.primary, border: "transparent" },
    onDark: { bg: "transparent", fg: "#fff", border: "transparent" },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: palette.bg, borderColor: palette.border, minHeight: small ? 40 : 52 },
        off && { opacity: 0.55 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 20} color={palette.fg} style={{ marginRight: 8 }} />}
          <Text style={[styles.btnText, { color: palette.fg, fontSize: small ? 14 : 16 }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

// ───────────── Champ de saisie ─────────────
type InputProps = TextInputProps & { label?: string; error?: string | null; hint?: string; icon?: IconName };

export const Input = forwardRef<TextInput, InputProps>(function Input({ label, error, hint, icon, secureTextEntry, style, ...rest }, ref) {
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          focused && { borderColor: colors.primary },
          error ? { borderColor: colors.error } : null,
          rest.multiline && { alignItems: "flex-start" },
        ]}
      >
        {icon ? <Ionicons name={icon} size={20} color={colors.muted} style={{ marginRight: 8, marginTop: rest.multiline ? 14 : 0 }} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.placeholder}
          style={[styles.input, rest.multiline && { minHeight: 90, textAlignVertical: "top", paddingTop: 14 }, style]}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={12} accessibilityLabel={hidden ? "Afficher le mot de passe" : "Masquer le mot de passe"}>
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={22} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

// ───────────── Cartes, badges, avatars ─────────────
export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

type Tone = "neutral" | "info" | "success" | "warning" | "error" | "traveler";
const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.neutralBg, fg: colors.muted },
  info: { bg: colors.primaryLight, fg: colors.primary },
  success: { bg: colors.successLight, fg: colors.success },
  warning: { bg: colors.warningLight, fg: colors.warning },
  error: { bg: colors.errorLight, fg: colors.error },
  traveler: { bg: colors.travelerLight, fg: colors.traveler },
};

export function Badge({ label, tone = "neutral", icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} style={{ marginRight: 4 }} /> : null}
      <Text style={{ color: t.fg, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}
export { TONES };

export function Avatar({ name, uri, size = 44 }: { name: string; uri?: string | null; size?: number }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.line }} />;
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.primary, fontWeight: "700", fontSize: size * 0.38 }}>{initials || "?"}</Text>
    </View>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= full ? "star" : "star-outline"} size={size} color={colors.traveler} />
      ))}
    </View>
  );
}

// ───────────── Textes ─────────────
export function H1({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[{ fontSize: 26, fontWeight: "700", color: colors.ink }, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[{ fontSize: 18, fontWeight: "700", color: colors.ink }, style]}>{children}</Text>;
}
export function Body({ children, style, muted }: { children: React.ReactNode; style?: any; muted?: boolean }) {
  return <Text style={[{ fontSize: 15, lineHeight: 21, color: muted ? colors.muted : colors.ink }, style]}>{children}</Text>;
}
export function SectionTitle({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 10 }}>
      <Text style={{ fontSize: 17, fontWeight: "700", color: colors.ink }}>{title}</Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={10}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ───────────── Lignes de liste ─────────────
export function Row({ icon, title, subtitle, onPress, right, danger }: { icon?: IconName; title: string; subtitle?: string; onPress?: () => void; right?: React.ReactNode; danger?: boolean }) {
  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.rowIcon, danger && { backgroundColor: colors.errorLight }]}>
          <Ionicons name={icon} size={20} color={danger ? colors.error : colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: danger ? colors.error : colors.ink }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null)}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { backgroundColor: colors.pressed }} accessibilityRole="button">
      {content}
    </Pressable>
  ) : (
    content
  );
}
export const Divider = () => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 16 }} />;

// ───────────── Onglets segmentés & puces ─────────────
export function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.segItem, active && styles.segActive]} accessibilityRole="tab" accessibilityState={{ selected: active }}>
            <Text style={{ fontWeight: "600", fontSize: 14, color: active ? colors.primary : colors.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]} accessibilityState={{ selected }}>
      {icon ? <Ionicons name={icon} size={16} color={selected ? "#fff" : colors.muted} style={{ marginRight: 6 }} /> : null}
      <Text style={{ color: selected ? "#fff" : colors.ink, fontWeight: "600", fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

// ───────────── États : chargement, vide, erreur ─────────────
export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <Text style={{ color: colors.muted, marginTop: 12 }}>{label}</Text> : null}
    </View>
  );
}

export function Skeleton({ height = 90, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height, borderRadius: radius.card, backgroundColor: colors.track, marginBottom: 12 }, style]} />;
}
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} />
      ))}
    </View>
  );
}

export function EmptyState({ icon = "file-tray-outline", title, text, action }: { icon?: IconName; title: string; text?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={34} color={colors.primary} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink, textAlign: "center" }}>{title}</Text>
      {text ? <Text style={{ color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 20 }}>{text}</Text> : null}
      {action ? <Button title={action.label} onPress={action.onPress} style={{ marginTop: 18, alignSelf: "stretch" }} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry, network }: { message: string; onRetry?: () => void; network?: boolean }) {
  return (
    <View style={styles.center}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.errorLight }]}>
        <Ionicons name={network ? "cloud-offline-outline" : "alert-circle-outline"} size={34} color={colors.error} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink, textAlign: "center" }}>{network ? "Pas de connexion" : "Oups, un souci"}</Text>
      <Text style={{ color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 20 }}>{message}</Text>
      {onRetry ? <Button title="Réessayer" variant="secondary" onPress={onRetry} style={{ marginTop: 18, alignSelf: "stretch" }} /> : null}
    </View>
  );
}

export function InlineMessage({ tone = "error", text }: { tone?: "error" | "success" | "info" | "warning"; text: string }) {
  const t = TONES[tone];
  return (
    <View style={{ backgroundColor: t.bg, padding: 12, borderRadius: radius.control, marginBottom: 12 }}>
      <Text style={{ color: t.fg, fontWeight: "500", lineHeight: 19 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.control, borderWidth: 1.5, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btnText: { fontWeight: "700" },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 6 },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.control, paddingHorizontal: 14, minHeight: TOUCH + 4 },
  input: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 12 },
  error: { color: colors.error, fontSize: 13, marginTop: 5 },
  hint: { color: colors.muted, fontSize: 13, marginTop: 5 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 16, marginBottom: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, ...shadow },
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, minHeight: 60 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 14 },
  segment: { flexDirection: "row", backgroundColor: colors.track, borderRadius: radius.control, padding: 4, marginBottom: 14 },
  segItem: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 9 },
  segActive: { backgroundColor: colors.surface, ...shadow, shadowOpacity: 0.08, elevation: 1 },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, minHeight: 44, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, marginRight: 8, marginBottom: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 16 },
});

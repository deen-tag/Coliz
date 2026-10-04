import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius } from "@/lib/theme";
import { currentCity, LocationDenied, searchCities } from "@/lib/location";
import { useDebounced } from "@/lib/hooks";
import type { CityChoice } from "@/lib/types";
import { IconName } from "./ui";

type Props = {
  label: string;
  placeholder?: string;
  value: CityChoice | null;
  onChange: (c: CityChoice | null) => void;
  icon?: IconName;
  error?: string | null;
  allowLocation?: boolean;
};

// Champ « ville » : ouvre un écran de recherche avec suggestions + « Utiliser ma position ».
export function CityField({ label, placeholder = "Ville, aéroport, gare ou port", value, onChange, icon = "location-outline", error, allowLocation }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${value?.label ?? "non renseigné"}`}
        style={[styles.field, error ? { borderColor: colors.error } : null]}
      >
        <Ionicons name={icon} size={20} color={colors.muted} style={{ marginRight: 8 }} />
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, color: value ? colors.ink : colors.placeholder }}>
          {value?.label ?? placeholder}
        </Text>
        {value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={12} accessibilityLabel="Effacer">
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <CityPicker
        visible={open}
        title={label}
        allowLocation={allowLocation}
        onClose={() => setOpen(false)}
        onPick={(c) => {
          onChange(c);
          setOpen(false);
        }}
      />
    </View>
  );
}

function CityPicker({ visible, title, allowLocation, onClose, onPick }: { visible: boolean; title: string; allowLocation?: boolean; onClose: () => void; onPick: (c: CityChoice) => void }) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const [results, setResults] = useState<CityChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setQ("");
      setResults([]);
      setMsg(null);
    }
  }, [visible]);

  useEffect(() => {
    let cancelled = false;
    if (dq.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    searchCities(dq).then((r) => {
      if (!cancelled) {
        setResults(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dq]);

  async function useMyLocation() {
    setMsg(null);
    setLocating(true);
    try {
      onPick(await currentCity());
    } catch (e) {
      setMsg(e instanceof LocationDenied ? "Autorisez la localisation dans les réglages du téléphone pour utiliser cette fonction." : "Impossible de déterminer votre position.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 16 }}>
        <View style={styles.header}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink }}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fermer">
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
        </View>
        <View style={[styles.field, { marginHorizontal: 16 }]}>
          <Ionicons name="search" size={20} color={colors.muted} style={{ marginRight: 8 }} />
          <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Ville, aéroport, gare ou port…" placeholderTextColor={colors.placeholder} style={{ flex: 1, fontSize: 16, color: colors.ink }} returnKeyType="search" autoCorrect={false} />
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
        </View>
        {allowLocation ? (
          <Pressable onPress={useMyLocation} disabled={locating} style={styles.loc} accessibilityRole="button">
            {locating ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="navigate" size={20} color={colors.primary} />}
            <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 16, marginLeft: 10 }}>Utiliser ma position</Text>
          </Pressable>
        ) : null}
        {msg ? <Text style={[styles.error, { marginHorizontal: 16 }]}>{msg}</Text> : null}
        <FlatList
          data={results}
          keyExtractor={(c, i) => `${c.label}-${i}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          ListEmptyComponent={
            dq.trim().length >= 2 && !loading ? (
              <Text style={{ color: colors.muted, textAlign: "center", marginTop: 32, paddingHorizontal: 24 }}>Aucune ville trouvée. Vérifiez l'orthographe.</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => onPick(item)} style={({ pressed }) => [styles.result, pressed && { backgroundColor: colors.pressed }]} accessibilityRole="button">
              <Ionicons name="location-outline" size={20} color={colors.muted} style={{ marginRight: 12 }} />
              <Text style={{ flex: 1, fontSize: 16, color: colors.ink }}>{item.label}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 6 },
  field: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.control, paddingHorizontal: 14, minHeight: 52 },
  error: { color: colors.error, fontSize: 13, marginTop: 5 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14 },
  loc: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, minHeight: 56 },
  result: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});

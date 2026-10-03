import React, { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { colors, radius } from "@/lib/theme";
import { Button } from "./ui";

type Props = {
  label: string;
  value: Date | null;
  onChange: (d: Date | null) => void;
  withTime?: boolean;
  minimumDate?: Date;
  error?: string | null;
  clearable?: boolean;
  placeholder?: string;
};

export function DateField({ label, value, onChange, withTime, minimumDate, error, clearable, placeholder = "Choisir une date" }: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());

  function open() {
    const start = value ?? new Date();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: start,
        mode: "date",
        minimumDate,
        onChange: (e, d) => {
          if (e.type !== "set" || !d) return;
          if (!withTime) return onChange(d);
          // Android : la date puis l'heure se choisissent l'une après l'autre.
          DateTimePickerAndroid.open({
            value: d,
            mode: "time",
            is24Hour: true,
            onChange: (e2, t) => {
              if (e2.type !== "set" || !t) return;
              const merged = new Date(d);
              merged.setHours(t.getHours(), t.getMinutes(), 0, 0);
              onChange(merged);
            },
          });
        },
      });
    } else {
      setDraft(start);
      setIosOpen(true);
    }
  }

  const text = value ? format(value, withTime ? "EEE d MMM yyyy 'à' HH:mm" : "EEE d MMM yyyy", { locale: fr }) : placeholder;

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={open} style={[styles.field, error ? { borderColor: colors.error } : null]} accessibilityRole="button" accessibilityLabel={`${label} : ${text}`}>
        <Ionicons name="calendar-outline" size={20} color={colors.muted} style={{ marginRight: 8 }} />
        <Text style={{ flex: 1, fontSize: 16, color: value ? colors.ink : colors.placeholder }}>{text}</Text>
        {clearable && value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={12} accessibilityLabel="Effacer la date">
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === "ios" ? (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setIosOpen(false)} />
          <View style={{ backgroundColor: colors.surface, padding: 16, paddingBottom: 32 }}>
            <DateTimePicker value={draft} mode={withTime ? "datetime" : "date"} display="spinner" locale="fr-FR" minimumDate={minimumDate} onChange={(_, d) => d && setDraft(d)} />
            <Button
              title="Valider"
              onPress={() => {
                onChange(draft);
                setIosOpen(false);
              }}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 6 },
  field: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.control, paddingHorizontal: 14, minHeight: 52 },
  error: { color: colors.error, fontSize: 13, marginTop: 5 },
});

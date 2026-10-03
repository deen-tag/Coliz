import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";

export function eur(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  return `${n.toFixed(2).replace(".", ",")} €`;
}

export function shortCity(label: string) {
  return label.split(",")[0].trim();
}

export function dateLong(iso: string) {
  return format(new Date(iso), "EEEE d MMMM yyyy", { locale: fr });
}
export function dateShort(iso: string) {
  return format(new Date(iso), "EEE d MMM", { locale: fr });
}
export function timeShort(iso: string) {
  return format(new Date(iso), "HH:mm", { locale: fr });
}
export function dateTime(iso: string) {
  return format(new Date(iso), "d MMM yyyy 'à' HH:mm", { locale: fr });
}
export function relative(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Hier";
  if (Date.now() - d.getTime() < 7 * 86400000) return format(d, "EEE", { locale: fr });
  return format(d, "d MMM", { locale: fr });
}
export function ago(iso: string) {
  return formatDistanceToNowStrict(new Date(iso), { locale: fr, addSuffix: true });
}

export const MODES: Record<string, { label: string; icon: string }> = {
  CAR: { label: "Voiture", icon: "car-outline" },
  TRAIN: { label: "Train", icon: "train-outline" },
  BUS: { label: "Bus", icon: "bus-outline" },
  PLANE: { label: "Avion", icon: "airplane-outline" },
  MOTORCYCLE: { label: "Moto", icon: "speedometer-outline" },
  BICYCLE: { label: "Vélo", icon: "bicycle-outline" },
  VAN: { label: "Camionnette", icon: "car-sport-outline" },
  FERRY: { label: "Ferry", icon: "boat-outline" },
  OTHER: { label: "Autre", icon: "cube-outline" },
};
export const modeInfo = (m: string) => MODES[m] ?? MODES.OTHER;

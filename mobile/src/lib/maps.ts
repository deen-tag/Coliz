import { Linking, Platform } from "react-native";

// Ouvre l'application Plans (iPhone) ou Maps (Android) sur un lieu.
export function openInMaps(label: string, lat: number, lng: number) {
  const q = encodeURIComponent(label);
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?ll=${lat},${lng}&q=${q}`
      : `geo:${lat},${lng}?q=${lat},${lng}(${q})`;
  return Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`));
}

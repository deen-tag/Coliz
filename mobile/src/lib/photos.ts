import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { api } from "./api";

// Photo : caméra ou galerie, réduite à 1280 px pour rester légère (limite serveur 4 Mo).
export async function pickPhoto(source: "camera" | "library"): Promise<string | null> {
  const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Autorisation nécessaire", source === "camera" ? "Autorisez la caméra dans les réglages du téléphone pour prendre une photo." : "Autorisez l'accès aux photos dans les réglages du téléphone.");
    return null;
  }
  const res =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
  if (res.canceled || !res.assets?.[0]) return null;
  const out = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 1280 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
  return out.uri;
}

export async function uploadImage(path: "/api/uploads/parcel-photo" | "/api/avatar", uri: string): Promise<string> {
  const form = new FormData();
  form.append("file", { uri, name: "photo.jpg", type: "image/jpeg" } as any);
  const res = await api<{ url?: string; avatarUrl?: string }>(path, { method: "POST", form, timeoutMs: 60000 });
  return (res.url ?? res.avatarUrl) as string;
}


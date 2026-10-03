import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "./api";
import { secure } from "./storage";

// Les notifications reçues quand l'app est ouverte s'affichent en bannière.
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }) as any,
});

export async function setupAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Coliz",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#1B5E6E",
    });
  }
}

// Demande l'autorisation, récupère le jeton Expo Push et l'envoie à votre serveur.
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null; // pas de push sur simulateur
  await setupAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return null;

  const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
  if (!projectId) return null; // sera renseigné après « eas init »

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api("/api/mobile/push-token", { method: "POST", body: { token, platform: Platform.OS } });
  await secure.setPushToken(token);
  return token;
}

export async function unregisterPush() {
  const token = await secure.getPushToken();
  if (!token) return;
  try {
    await api("/api/mobile/push-token", { method: "DELETE", body: { token } });
  } finally {
    await secure.clearPushToken();
  }
}

// Où mène un tap sur une notification (les données viennent de notifyUser côté serveur).
export function routeForNotification(data: any): string | null {
  if (!data) return null;
  if (data.type === "new_message" && data.bookingId) return `/chat/${data.bookingId}`;
  if (data.bookingId) return `/booking/${data.bookingId}`;
  return "/notifications";
}

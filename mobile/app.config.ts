import type { ExpoConfig } from "expo/config";
import settings from "./coliz.config.json";

// Aucune clé SECRÈTE ici : uniquement l'adresse de votre site, la clé Stripe PUBLIQUE (pk_...)
// et, si vous voulez la carte intégrée sur Android, une clé Google Maps restreinte à l'application.

const config: ExpoConfig = {
  name: "Coliz",
  slug: "coliz",
  scheme: "coliz",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  backgroundColor: "#FAF8F4",
  newArchEnabled: true,
  assetBundlePatterns: ["**/*"],
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#1B5E6E",
  },
  ios: {
    bundleIdentifier: settings.bundleId,
    supportsTablet: false,
    buildNumber: "1",
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        "Coliz utilise votre position pour pré-remplir votre ville de départ et trouver les trajets proches de vous.",
      NSCameraUsageDescription: "Coliz utilise la caméra pour photographier votre colis ou votre photo de profil.",
      NSPhotoLibraryUsageDescription: "Coliz accède à vos photos pour joindre une image à votre colis ou à votre profil.",
      NSFaceIDUsageDescription: "Coliz utilise Face ID pour verrouiller l'application si vous activez cette option.",
    },
    ...(settings.universalLinkHost
      ? { associatedDomains: [`applinks:${settings.universalLinkHost}`] }
      : {}),
  },
  android: {
    package: settings.bundleId,
    versionCode: 1,
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#1B5E6E" },
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "CAMERA",
      "POST_NOTIFICATIONS",
      "USE_BIOMETRIC",
      "USE_FINGERPRINT",
    ],
    // Pas de lecture/écriture de stockage : le sélecteur de photos Android n'en a pas besoin.
    blockedPermissions: ["android.permission.READ_EXTERNAL_STORAGE", "android.permission.WRITE_EXTERNAL_STORAGE", "android.permission.SYSTEM_ALERT_WINDOW"],
    ...(settings.googleMapsAndroidKey ? { config: { googleMaps: { apiKey: settings.googleMapsAndroidKey } } } : {}),
    ...(settings.universalLinkHost
      ? {
          intentFilters: [
            {
              action: "VIEW",
              autoVerify: true,
              data: [{ scheme: "https", host: settings.universalLinkHost, pathPrefix: "/trajets" }],
              category: ["BROWSABLE", "DEFAULT"],
            },
          ],
        }
      : {}),
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    ["expo-notifications", { icon: "./assets/notification-icon.png", color: "#1B5E6E" }],
    ["expo-location", { locationWhenInUsePermission: "Coliz utilise votre position pour pré-remplir votre ville de départ." }],
    [
      "expo-image-picker",
      {
        photosPermission: "Coliz accède à vos photos pour joindre une image à votre colis ou à votre profil.",
        cameraPermission: "Coliz utilise la caméra pour photographier votre colis ou votre photo de profil.",
      },
    ],
    ["expo-local-authentication", { faceIDPermission: "Coliz utilise Face ID pour verrouiller l'application si vous activez cette option." }],
    ["@stripe/stripe-react-native", { enableGooglePay: false }],
  ],
  experiments: { typedRoutes: false },
  extra: {
    apiUrl: settings.apiUrl,
    stripePublishableKey: settings.stripePublishableKey,
    hasAndroidMapsKey: Boolean(settings.googleMapsAndroidKey),
    // Rempli automatiquement par la commande « eas init » (identifiant de votre projet Expo).
    eas: { projectId: process.env.EAS_PROJECT_ID ?? undefined },
  },
};

export default config;

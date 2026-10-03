import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  stripePublishableKey?: string;
  hasAndroidMapsKey?: boolean;
};

export const API_URL = (extra.apiUrl ?? "").replace(/\/+$/, "");
export const STRIPE_PUBLISHABLE_KEY = extra.stripePublishableKey ?? "";
export const HAS_ANDROID_MAPS_KEY = Boolean(extra.hasAndroidMapsKey);
export const IS_CONFIGURED = API_URL.startsWith("http") && !API_URL.includes("VOTRE-SITE");

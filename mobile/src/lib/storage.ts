import * as SecureStore from "expo-secure-store";

// Tout ce qui est sensible (jeton de connexion) va dans le coffre sécurisé du téléphone
// (Keychain sur iPhone, Keystore sur Android) — jamais dans un stockage en clair.
const TOKEN_KEY = "coliz.token";
const PREFS_KEY = "coliz.prefs";
const PUSH_KEY = "coliz.pushToken";

export const secure = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  setToken: (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t),
  clearToken: () => SecureStore.deleteItemAsync(TOKEN_KEY),
  getPushToken: () => SecureStore.getItemAsync(PUSH_KEY),
  setPushToken: (t: string) => SecureStore.setItemAsync(PUSH_KEY, t),
  clearPushToken: () => SecureStore.deleteItemAsync(PUSH_KEY),
};

export type Prefs = { onboardingDone: boolean; biometricLock: boolean };
const DEFAULT_PREFS: Prefs = { onboardingDone: false, biometricLock: false };

export async function loadPrefs(): Promise<Prefs> {
  try {
    const raw = await SecureStore.getItemAsync(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function savePrefs(p: Prefs) {
  await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(p));
}

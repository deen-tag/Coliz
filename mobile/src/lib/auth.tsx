import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { api, ApiError, setAuthToken, setSessionExpiredHandler } from "./api";
import { loadPrefs, Prefs, savePrefs, secure } from "./storage";
import type { MeUser } from "./types";
import { registerForPush, unregisterPush } from "./push";

SplashScreen.preventAutoHideAsync().catch(() => {});

type AuthState = {
  ready: boolean;
  user: MeUser | null;
  prefs: Prefs;
  online: boolean; // false si on n'a pas pu joindre le serveur au démarrage
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (d: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updatePrefs: (p: Partial<Prefs>) => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return v;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({ onboardingDone: false, biometricLock: false });
  const [online, setOnline] = useState(true);
  const signingOut = useRef(false);

  const clearSession = useCallback(async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    try {
      await unregisterPush().catch(() => {});
      setAuthToken(null);
      await secure.clearToken();
      setUser(null);
    } finally {
      signingOut.current = false;
    }
  }, []);

  const startSession = useCallback(async (token: string, u: MeUser) => {
    await secure.setToken(token);
    setAuthToken(token);
    setUser(u);
    registerForPush().catch(() => {});
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearSession();
    });
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  // Démarrage : on récupère les préférences et le jeton, puis on renouvelle la session.
  useEffect(() => {
    (async () => {
      try {
        setPrefs(await loadPrefs());
        const token = await secure.getToken();
        if (token) {
          setAuthToken(token);
          try {
            const refreshed = await api<{ token: string }>("/api/mobile/auth/refresh", { method: "POST" });
            await secure.setToken(refreshed.token);
            setAuthToken(refreshed.token);
            setUser(await api<MeUser>("/api/mobile/me"));
            registerForPush().catch(() => {});
          } catch (e) {
            if (e instanceof ApiError && e.isNetwork) {
              // Hors ligne : on garde la session, les écrans afficheront l'état « pas de connexion ».
              setOnline(false);
              try {
                setUser(await api<MeUser>("/api/mobile/me"));
              } catch {
                /* toujours hors ligne */
              }
            } else {
              await clearSession();
            }
          }
        }
      } finally {
        setReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
  }, [clearSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ token: string; user: MeUser }>("/api/mobile/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
        auth: false,
      });
      const me = await (async () => {
        setAuthToken(res.token);
        return api<MeUser>("/api/mobile/me");
      })();
      await startSession(res.token, me);
    },
    [startSession]
  );

  const signUp = useCallback(
    async (d: { email: string; password: string; firstName: string; lastName: string }) => {
      await api("/api/auth/register", { method: "POST", body: { ...d, email: d.email.trim() }, auth: false });
      await signIn(d.email, d.password);
    },
    [signIn]
  );

  const refreshUser = useCallback(async () => {
    try {
      setUser(await api<MeUser>("/api/mobile/me"));
    } catch {
      /* géré par l'intercepteur 401 */
    }
  }, []);

  const updatePrefs = useCallback(
    async (p: Partial<Prefs>) => {
      const next = { ...prefs, ...p };
      setPrefs(next);
      await savePrefs(next);
    },
    [prefs]
  );

  const value = useMemo<AuthState>(
    () => ({ ready, user, prefs, online, signIn, signUp, signOut: clearSession, refreshUser, updatePrefs }),
    [ready, user, prefs, online, signIn, signUp, clearSession, refreshUser, updatePrefs]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

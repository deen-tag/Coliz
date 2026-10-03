import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api, ApiError } from "./api";

type State<T> = { data: T | null; error: ApiError | null; loading: boolean; refreshing: boolean };

// Charge une URL de l'API ; recharge quand l'écran reprend le focus ; pull-to-refresh via refresh().
// `path = null` : ne charge rien (utile quand l'utilisateur n'est pas connecté).
export function useApi<T>(
  path: string | null,
  opts: { query?: Record<string, any>; pollMs?: number; reloadOnFocus?: boolean } = {}
) {
  const { query, pollMs, reloadOnFocus = true } = opts;
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: Boolean(path), refreshing: false });
  const mounted = useRef(true);
  const key = path ? path + JSON.stringify(query ?? {}) : "";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "silent" = "initial") => {
      if (!path) return;
      if (mode === "initial") setState((s) => ({ ...s, loading: s.data === null, error: null }));
      if (mode === "refresh") setState((s) => ({ ...s, refreshing: true }));
      try {
        const data = await api<T>(path, { query });
        if (mounted.current) setState({ data, error: null, loading: false, refreshing: false });
      } catch (e) {
        if (!mounted.current) return;
        const err = e instanceof ApiError ? e : new ApiError(500, "Une erreur est survenue.");
        // En rafraîchissement silencieux (polling), on garde les données déjà affichées.
        setState((s) => ({ data: mode === "silent" ? s.data : s.data, error: mode === "silent" ? s.error : err, loading: false, refreshing: false }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false, refreshing: false });
      return;
    }
    load("initial");
  }, [key, load, path]);

  useFocusEffect(
    useCallback(() => {
      if (reloadOnFocus && path) load("silent");
      if (!pollMs || !path) return;
      const id = setInterval(() => load("silent"), pollMs);
      return () => clearInterval(id);
    }, [load, pollMs, path, reloadOnFocus])
  );

  return {
    ...state,
    reload: () => load("initial"),
    refresh: () => load("refresh"),
    silentReload: () => load("silent"),
    setData: (d: T | null) => setState((s) => ({ ...s, data: d })),
  };
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

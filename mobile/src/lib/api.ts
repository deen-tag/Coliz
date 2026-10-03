import { API_URL } from "./config";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

let authToken: string | null = null;
let onSessionExpired: (() => void) | null = null;
let checking = false;

export function setAuthToken(t: string | null) {
  authToken = t;
}
export function setSessionExpiredHandler(fn: (() => void) | null) {
  onSessionExpired = fn;
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  form?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean; // true par défaut : envoie le jeton s'il existe
  timeoutMs?: number;
};

// Les routes Zod du backend renvoient { error: { fieldErrors, formErrors } } ; les autres { error: "texte" }.
function extractMessage(data: any, status: number): string {
  const err = data?.error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const field = Object.values(err.fieldErrors ?? {}).flat()[0];
    const form = (err.formErrors ?? [])[0];
    if (typeof field === "string") return field;
    if (typeof form === "string") return form;
  }
  if (status === 401) return "Votre session a expiré. Reconnectez-vous.";
  if (status === 403) return "Action non autorisée.";
  if (status === 404) return "Élément introuvable.";
  if (status === 429) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (status >= 500) return "Le serveur a rencontré un problème. Réessayez dans un instant.";
  return "Une erreur est survenue.";
}

// Le backend peut répondre 500 (au lieu de 401) quand un jeton est invalide : on vérifie
// alors la session auprès de /api/mobile/me, qui renvoie un vrai 401.
async function verifySession() {
  if (checking || !authToken) return;
  checking = true;
  try {
    const res = await fetch(`${API_URL}/api/mobile/me`, { headers: { Authorization: `Bearer ${authToken}` } });
    if (res.status === 401) onSessionExpired?.();
  } catch {
    // hors ligne : on ne déconnecte pas
  } finally {
    checking = false;
  }
}

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, form, query, auth = true, timeoutMs = 20000 } = opts;

  let url = `${API_URL}${path}`;
  if (query) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;
  let payload: any;
  if (form) payload = form; // React Native fixe lui-même le Content-Type multipart
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: payload, signal: controller.signal });
  } catch (e: any) {
    throw new ApiError(
      0,
      e?.name === "AbortError"
        ? "Le serveur met trop de temps à répondre. Vérifiez votre connexion."
        : "Pas de connexion à Internet."
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    if (auth && authToken && (res.status === 401 || res.status === 500)) {
      if (res.status === 401) onSessionExpired?.();
      else verifySession();
    }
    throw new ApiError(res.status, extractMessage(data, res.status));
  }
  return data as T;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "Une erreur est survenue.";
}

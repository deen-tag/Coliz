// Redirection après connexion : on n'accepte que des chemins internes
// (jamais une URL externe) pour éviter les redirections ouvertes.
export function safeCallbackUrl(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

// Construit un lien vers /connexion ou /inscription en conservant la page
// d'origine, pour que l'utilisateur y revienne une fois identifié.
export function authHref(
  page: "/connexion" | "/inscription",
  callbackUrl?: string | null,
  extra: Record<string, string> = {}
) {
  const q = new URLSearchParams(extra);
  if (callbackUrl) q.set("callbackUrl", callbackUrl);
  const s = q.toString();
  return s ? `${page}?${s}` : page;
}

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Card, PrimaryButton } from "@/components/ui";
import { Logo } from "@/components/logo";
import { IconField } from "@/components/form-field";
import { UserIcon, MailIcon, LockIcon } from "@/components/icons";
import { JourneySteps } from "@/components/journey-steps";
import { AuthTripContext, tripIdFromCallback } from "@/components/auth-context";
import { authHref, safeCallbackUrl } from "@/lib/callback-url";

export default function InscriptionPage() {
  return (
    <Suspense fallback={null}>
      <InscriptionForm />
    </Suspense>
  );
}

function InscriptionForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl");
  const tripId = tripIdFromCallback(callbackUrl);
  // Venu de « Proposer un trajet » : on reste dans la couleur du voyageur jusqu'au bout.
  const isTravelerFlow = callbackUrl?.startsWith("/trajets/nouveau") ?? false;
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Une erreur est survenue.");
      return;
    }
    // Compte créé : on connecte directement, pour ne pas faire ressaisir les identifiants.
    const login = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    if (login?.error) {
      router.push(authHref("/connexion", callbackUrl, { registered: "1" }));
      return;
    }
    router.push(safeCallbackUrl(callbackUrl));
  }

  return (
    <main data-role={isTravelerFlow ? "traveler" : "sender"} className="min-h-screen bg-surface-alt px-4 py-10 max-w-sm mx-auto">
      <div className="flex justify-center mb-8">
        <a href="/" aria-label="Accueil Coliz">
          <Logo variant="primary" size={40} />
        </a>
      </div>
      {tripId && <JourneySteps current={4} />}
      <h1 className="text-2xl font-extrabold tracking-tight text-ink mb-1">
        {tripId ? "Créez votre compte pour réserver" : isTravelerFlow ? "Créez votre compte pour publier votre trajet" : "Créer un compte"}
      </h1>
      <p className="text-sm text-ink-muted mb-6">
        {tripId
          ? "Vous reviendrez directement sur ce trajet."
          : isTravelerFlow
            ? "Gagnez de l'argent en transportant un colis sur un trajet que vous faites déjà."
            : "Envoyez ou transportez des colis en quelques minutes."}
      </p>
      {tripId && <AuthTripContext tripId={tripId} />}

      <Card as="form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <IconField label="Prénom" icon={<UserIcon size={18} />} required value={form.firstName} onChange={update("firstName")} />
          <IconField label="Nom" icon={<UserIcon size={18} />} required value={form.lastName} onChange={update("lastName")} />
        </div>
        <IconField label="Email" icon={<MailIcon size={18} />} type="email" required value={form.email} onChange={update("email")} />
        <IconField label="Mot de passe" icon={<LockIcon size={18} />} type="password" required value={form.password} onChange={update("password")} />
        {error && <p className="text-sm text-error">{error}</p>}
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Création..." : tripId ? "Créer mon compte et continuer" : "Créer mon compte"}
        </PrimaryButton>
      </Card>

      <p className="text-center text-sm text-ink-muted mt-5">
        Déjà inscrit ?{" "}
        <a href={authHref("/connexion", callbackUrl)} className="text-primary font-medium">
          Se connecter
        </a>
      </p>
    </main>
  );
}

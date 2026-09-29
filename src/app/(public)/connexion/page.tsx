"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, PrimaryButton } from "@/components/ui";
import { Logo } from "@/components/logo";
import { IconField } from "@/components/form-field";
import { MailIcon, LockIcon } from "@/components/icons";
import { JourneySteps } from "@/components/journey-steps";
import { AuthTripContext, tripIdFromCallback } from "@/components/auth-context";
import { authHref, safeCallbackUrl } from "@/lib/callback-url";

export default function ConnexionPage() {
  return (
    <Suspense fallback={null}>
      <ConnexionForm />
    </Suspense>
  );
}

function ConnexionForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    router.push(safeCallbackUrl(params.get("callbackUrl")));
  }

  const callbackUrl = params.get("callbackUrl");
  const tripId = tripIdFromCallback(callbackUrl);
  const registered = params.get("registered") === "1";

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-10 max-w-sm mx-auto">
      <div className="flex justify-center mb-8">
        <a href="/" aria-label="Accueil Coliz">
          <Logo variant="primary" size={40} />
        </a>
      </div>
      {tripId && <JourneySteps current={4} />}
      <h1 className="text-2xl font-semibold text-ink mb-1">
        {tripId ? "Connectez-vous pour réserver" : "Se connecter"}
      </h1>
      <p className="text-sm text-ink-muted mb-6">
        {tripId ? "Vous reviendrez directement sur ce trajet." : "Accédez à votre espace Coliz."}
      </p>
      {registered && (
        <p className="mb-5 rounded-control bg-success-light text-success text-sm px-4 py-3">
          Votre compte est créé. Connectez-vous pour continuer.
        </p>
      )}
      {tripId && <AuthTripContext tripId={tripId} />}

      <Card as="form" onSubmit={handleSubmit} className="space-y-4">
        <IconField
          label="Email"
          icon={<MailIcon size={18} />}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <IconField
          label="Mot de passe"
          icon={<LockIcon size={18} />}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </PrimaryButton>
        <p className="text-center">
          <a href="/mot-de-passe-oublie" className="text-sm text-ink-muted">
            Mot de passe oublié ?
          </a>
        </p>
      </Card>

      <p className="text-center text-sm text-ink-muted mt-5">
        Pas encore de compte ?{" "}
        <a href={authHref("/inscription", callbackUrl)} className="text-primary font-medium">
          Créer un compte
        </a>
      </p>
    </main>
  );
}

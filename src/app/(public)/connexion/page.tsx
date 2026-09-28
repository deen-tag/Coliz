"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, PrimaryButton } from "@/components/ui";
import { Logo } from "@/components/logo";

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
    router.push(params.get("callbackUrl") ?? "/dashboard");
  }

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-10 max-w-sm mx-auto">
      <div className="flex justify-center mb-8">
        <Logo variant="primary" size={40} />
      </div>
      <h1 className="text-2xl font-semibold text-ink mb-1">Se connecter</h1>
      <p className="text-sm text-ink-muted mb-6">Accédez à votre espace Coliz.</p>

      <Card as="form" onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1.5">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-control border border-line px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1.5">Mot de passe</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-control border border-line px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
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
        <a href="/inscription" className="text-primary font-medium">
          Créer un compte
        </a>
      </p>
    </main>
  );
}

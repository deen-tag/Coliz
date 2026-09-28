"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, PrimaryButton } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function ReinitialiserMotDePassePage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error?.fieldErrors?.password?.[0] ?? (typeof data.error === "string" ? data.error : "Une erreur est survenue."));
      return;
    }
    setDone(true);
  }

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-10 max-w-sm mx-auto">
      <div className="flex justify-center mb-8">
        <Logo variant="primary" size={40} />
      </div>
      <h1 className="text-2xl font-semibold text-ink mb-1">Nouveau mot de passe</h1>
      <p className="text-sm text-ink-muted mb-6">Choisissez un mot de passe d&apos;au moins 8 caractères.</p>

      {done ? (
        <Card>
          <p className="text-sm text-success font-medium mb-3">Votre mot de passe a bien été modifié.</p>
          <Link href="/connexion">
            <PrimaryButton>Se connecter</PrimaryButton>
          </Link>
        </Card>
      ) : (
        <Card as="form" onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1.5">Nouveau mot de passe</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-control border border-line px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          {error && <p className="text-sm text-error">{error}</p>}
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </PrimaryButton>
        </Card>
      )}
    </main>
  );
}

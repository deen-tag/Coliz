"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, PrimaryButton } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-10 max-w-sm mx-auto">
      <div className="flex justify-center mb-8">
        <Logo variant="primary" size={40} />
      </div>
      <h1 className="text-2xl font-semibold text-ink mb-1">Mot de passe oublié</h1>
      <p className="text-sm text-ink-muted mb-6">Saisissez votre email, nous vous envoyons un lien pour en choisir un nouveau.</p>

      {sent ? (
        <Card>
          <p className="text-sm text-ink">
            Si un compte existe avec cette adresse, un email vient d&apos;être envoyé. Le lien est valable 1 heure.
          </p>
        </Card>
      ) : (
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
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Envoi..." : "Envoyer le lien"}
          </PrimaryButton>
        </Card>
      )}

      <p className="text-center text-sm text-ink-muted mt-5">
        <Link href="/connexion" className="text-primary font-medium">
          Retour à la connexion
        </Link>
      </p>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function InscriptionPage() {
  const router = useRouter();
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
    router.push("/connexion");
  }

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-10 max-w-sm mx-auto">
      <div className="flex justify-center mb-8">
        <Logo variant="primary" size={40} />
      </div>
      <h1 className="text-2xl font-semibold text-ink mb-1">Créer un compte</h1>
      <p className="text-sm text-ink-muted mb-6">Envoyez ou transportez des colis en quelques minutes.</p>

      <Card as="form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" required value={form.firstName} onChange={update("firstName")} />
          <Input label="Nom" required value={form.lastName} onChange={update("lastName")} />
        </div>
        <Input label="Email" type="email" required value={form.email} onChange={update("email")} />
        <Input label="Mot de passe" type="password" required value={form.password} onChange={update("password")} />
        {error && <p className="text-sm text-error">{error}</p>}
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Création..." : "Créer mon compte"}
        </PrimaryButton>
      </Card>

      <p className="text-center text-sm text-ink-muted mt-5">
        Déjà inscrit ?{" "}
        <a href="/connexion" className="text-primary font-medium">
          Se connecter
        </a>
      </p>
    </main>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-sm text-ink-muted mb-1.5">{label}</span>
      <input
        className="w-full rounded-control border border-line px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
        {...props}
      />
    </label>
  );
}

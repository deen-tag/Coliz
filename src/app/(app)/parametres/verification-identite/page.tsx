"use client";

import { useState } from "react";
import { Card, PrimaryButton } from "@/components/ui";
import { ScreenHeader } from "@/components/screen-header";
import { ShieldIcon } from "@/components/icons";

export default function VerificationIdentitePage() {
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    const res = await fetch("/api/stripe/identity/session", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (data.url) window.location.href = data.url;
  }

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto">
      <ScreenHeader title="Vérification d'identité" />

      <Card className="text-center py-10 mb-6">
        <ShieldIcon size={40} className="text-primary mx-auto mb-4" />
        <p className="text-sm text-ink/70 mb-1">
          Un document d'identité valide vous sera demandé (carte d'identité, passeport ou permis).
        </p>
        <p className="text-xs text-ink/50">
          La vérification est traitée par Stripe Identity et prend généralement quelques minutes.
        </p>
      </Card>

      <PrimaryButton onClick={start} disabled={loading}>
        {loading ? "Redirection..." : "Commencer la vérification"}
      </PrimaryButton>
    </main>
  );
}

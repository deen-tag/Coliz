"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, PrimaryButton, SecondaryButton } from "@/components/ui";
import { ScreenHeader } from "@/components/screen-header";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ParametresPage() {
  const router = useRouter();
  const { data, mutate } = useSWR("/api/settings", fetcher);
  const [form, setForm] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  async function save(patch: Record<string, any>) {
    setForm((f: any) => ({ ...f, ...patch }));
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    mutate();
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Votre compte sera désactivé et vos informations personnelles anonymisées. Cette action est irréversible. Continuer ?"
    );
    if (!confirmed) return;
    await fetch("/api/settings/delete-account", { method: "POST" });
    await signOut({ redirect: false });
    router.push("/");
  }

  if (!form) return null;

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto">
      <ScreenHeader title="Paramètres" right={saved && <span className="text-xs text-success">Enregistré</span>} />

      <h2 className="text-sm font-medium text-ink-muted mb-3">Profil</h2>
      <Card className="mb-6 space-y-4">
        <Field
          label="Prénom"
          value={form.firstName ?? ""}
          onBlur={(e) => save({ firstName: e.target.value })}
          onChange={(e) => setForm((f: any) => ({ ...f, firstName: e.target.value }))}
        />
        <Field
          label="Nom"
          value={form.lastName ?? ""}
          onBlur={(e) => save({ lastName: e.target.value })}
          onChange={(e) => setForm((f: any) => ({ ...f, lastName: e.target.value }))}
        />
        <Field label="Email" value={form.email ?? ""} disabled />
        <Field
          label="Téléphone"
          value={form.phone ?? ""}
          onBlur={(e) => save({ phone: e.target.value })}
          onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))}
        />
      </Card>

      <h2 className="text-sm font-medium text-ink-muted mb-3">Vérification</h2>
      <Card className="mb-6 space-y-2">
        <VerificationRow label="Email" verified={form.verification?.email} />
        <VerificationRow label="Téléphone" verified={form.verification?.phone} />
        <VerificationRow label="Identité" verified={form.verification?.identity} action="/parametres/verification-identite" />
      </Card>

      <h2 className="text-sm font-medium text-ink-muted mb-3">Notifications</h2>
      <Card className="mb-6 space-y-4">
        <ToggleRow
          label="Notifications par email"
          checked={form.notifyEmail}
          onChange={(v) => save({ notifyEmail: v })}
        />
        <ToggleRow
          label="Notifications push"
          checked={form.notifyPush}
          onChange={(v) => save({ notifyPush: v })}
        />
      </Card>

      <h2 className="text-sm font-medium text-ink-muted mb-3">Langue</h2>
      <Card className="mb-6">
        <select
          value={form.language}
          onChange={(e) => save({ language: e.target.value })}
          className="w-full rounded-control border border-line px-4 py-3 text-[15px]"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
      </Card>

      <SecondaryButton onClick={() => signOut({ callbackUrl: "/" })} className="mb-3">
        Se déconnecter
      </SecondaryButton>

      <button onClick={handleDeleteAccount} className="w-full text-center text-sm text-error py-3">
        Supprimer mon compte
      </button>

    </main>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-sm text-ink-muted mb-1.5">{label}</span>
      <input
        className="w-full rounded-control border border-line px-4 py-3 text-[15px] disabled:bg-surface-alt disabled:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
        {...props}
      />
    </label>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-ink">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 accent-primary" />
    </label>
  );
}

function VerificationRow({ label, verified, action }: { label: string; verified?: boolean; action?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink">{label}</span>
      {verified ? (
        <span className="text-xs text-success font-medium">✓ Vérifié</span>
      ) : action ? (
        <a href={action} className="text-xs text-primary font-medium">Vérifier</a>
      ) : (
        <span className="text-xs text-ink-muted">Non vérifié</span>
      )}
    </div>
  );
}

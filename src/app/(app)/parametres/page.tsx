"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, SecondaryButton, SectionHeader, LoadingState } from "@/components/ui";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ParametresPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
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

  if (!form) return <LoadingState />;

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-6 max-w-md mx-auto md:max-w-2xl">
      <SectionHeader
        title="Profil et paramètres"
        subtitle={saved ? "Modifications enregistrées" : "Vos informations et préférences"}
        action={
          userId ? (
            <Link href={`/voyageurs/${userId}`} className="text-sm font-medium text-primary whitespace-nowrap">
              Voir mon profil public
            </Link>
          ) : undefined
        }
      />

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
        <VerificationRow label="Téléphone" verified={form.verification?.phone} pendingText="Bientôt disponible" />
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
          className="w-full rounded-control border border-line bg-surface px-4 py-3 text-[15px]"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
      </Card>

      <h2 className="text-sm font-medium text-ink-muted mb-3">Sécurité</h2>
      <Link href="/mot-de-passe-oublie" className="block mb-6">
        <Card className="text-sm text-ink">Changer mon mot de passe (un lien vous est envoyé par email)</Card>
      </Link>

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

function VerificationRow({
  label,
  verified,
  action,
  pendingText = "Non vérifié",
}: {
  label: string;
  verified?: boolean;
  action?: string;
  pendingText?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink">{label}</span>
      {verified ? (
        <span className="text-xs text-success font-medium">✓ Vérifié</span>
      ) : action ? (
        <a href={action} className="text-xs text-primary font-medium">Vérifier</a>
      ) : (
        <span className="text-xs text-ink-muted">{pendingText}</span>
      )}
    </div>
  );
}

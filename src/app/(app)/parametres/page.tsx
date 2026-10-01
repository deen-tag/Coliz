"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, SecondaryButton, SectionHeader, LoadingState } from "@/components/ui";
import { IconField, IconSelect } from "@/components/form-field";
import { UserIcon, MailIcon, PhoneIcon, GlobeIcon, CameraIcon } from "@/components/icons";
import { Avatar } from "@/components/avatar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Les photos de téléphone font souvent 5 à 12 Mo : on les réduit avant l'envoi
// (512 px suffisent largement pour un avatar) — plus rapide et sous la limite serveur.
async function shrinkImage(file: File, max = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("conversion"))), "image/jpeg", 0.85)
  );
}

export default function ParametresPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const { data, mutate } = useSWR("/api/settings", fetcher);
  const [form, setForm] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

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

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de rechoisir la même photo ensuite
    if (!file) return;
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      let small: Blob;
      try {
        small = await shrinkImage(file);
      } catch {
        // Format que le navigateur ne sait pas lire (ex. HEIC d'un iPhone).
        throw new Error("Cette image n'a pas pu être lue. Essayez une photo JPG ou PNG.");
      }
      const body = new FormData();
      body.append("file", small, "avatar.jpg");
      const res = await fetch("/api/avatar", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Envoi impossible, réessayez.");
      setForm((f: any) => ({ ...f, avatarUrl: json.avatarUrl }));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      mutate();
    } catch (err: any) {
      setPhotoError(err?.message ?? "Envoi impossible, réessayez.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handlePhotoRemove() {
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const res = await fetch("/api/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setForm((f: any) => ({ ...f, avatarUrl: null }));
      mutate();
    } catch {
      setPhotoError("Suppression impossible, réessayez.");
    } finally {
      setPhotoBusy(false);
    }
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
        subtitle={
          <>
            {saved ? "Modifications enregistrées" : "Vos informations et préférences"}
            {userId && (
              <Link href={`/voyageurs/${userId}`} className="block mt-1.5 font-medium text-primary">
                Voir mon profil public
              </Link>
            )}
          </>
        }
      />

      <h2 className="text-sm font-medium text-ink-muted mb-3">Profil</h2>
      <Card className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={photoBusy}
            className="relative shrink-0 rounded-full active:opacity-80 disabled:opacity-60"
            aria-label={form.avatarUrl ? "Changer ma photo" : "Ajouter une photo"}
          >
            <Avatar name={form.firstName} src={form.avatarUrl} size={72} />
            <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-primary text-white border-2 border-surface flex items-center justify-center">
              <CameraIcon size={14} />
            </span>
          </button>
          <div className="min-w-0">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoBusy}
              className="text-sm font-medium text-primary disabled:opacity-40"
            >
              {photoBusy ? "Envoi en cours…" : form.avatarUrl ? "Changer ma photo" : "Ajouter une photo"}
            </button>
            {form.avatarUrl && !photoBusy && (
              <button type="button" onClick={handlePhotoRemove} className="block text-xs text-ink-muted mt-1">
                Supprimer la photo
              </button>
            )}
            {photoError && <p className="text-xs text-error mt-1">{photoError}</p>}
          </div>
        </div>
        <IconField
          icon={<UserIcon size={18} />}
          label="Prénom"
          value={form.firstName ?? ""}
          onBlur={(e) => save({ firstName: e.target.value })}
          onChange={(e) => setForm((f: any) => ({ ...f, firstName: e.target.value }))}
        />
        <IconField
          icon={<UserIcon size={18} />}
          label="Nom"
          value={form.lastName ?? ""}
          onBlur={(e) => save({ lastName: e.target.value })}
          onChange={(e) => setForm((f: any) => ({ ...f, lastName: e.target.value }))}
        />
        <IconField label="Email" icon={<MailIcon size={18} />} value={form.email ?? ""} disabled />
        <IconField
          icon={<PhoneIcon size={18} />}
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
        <IconSelect
          icon={<GlobeIcon size={18} />}
          value={form.language}
          onChange={(e) => save({ language: e.target.value })}
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </IconSelect>
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

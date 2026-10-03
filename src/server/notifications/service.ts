import { prisma } from "@/lib/prisma";
import { sendEmail, emailTemplates } from "./email";

export type NotificationType =
  | "new_match"
  | "booking_requested"
  | "booking_accepted"
  | "booking_refused"
  | "price_proposed"
  | "payment_confirmed"
  | "parcel_picked_up"
  | "trip_departed"
  | "trip_arrived"
  | "delivery_confirmed"
  | "new_message"
  | "incident_action_required";

// Sous-ensemble des types jugés assez importants pour justifier un email
// (les autres restent in-app uniquement, pour éviter la sur-sollicitation).
const EMAIL_TEMPLATES: Partial<Record<NotificationType, () => { subject: string; html: string }>> = {
  booking_requested: emailTemplates.bookingRequested,
  payment_confirmed: emailTemplates.paymentConfirmed,
  delivery_confirmed: emailTemplates.deliveryConfirmed,
  incident_action_required: emailTemplates.incidentReported,
};

// Push mobile via le service Expo (aucune clé secrète requise côté serveur pour un usage standard).
// Best-effort : une panne du push ne doit jamais faire échouer l'action de l'utilisateur.
async function sendPush(userId: string, content: string, data: Record<string, string>) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifyPush: true, pushTokens: { select: { token: true } } },
  });
  if (!user || !user.notifyPush || user.pushTokens.length === 0) return;

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(
      user.pushTokens.map((t) => ({ to: t.token, sound: "default", title: "Coliz", body: content, data }))
    ),
  });
  if (!res.ok) return;

  // Nettoyage des appareils désinstallés (Expo répond DeviceNotRegistered).
  const json = (await res.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
  const dead = (json?.data ?? [])
    .map((r, i) => (r.status === "error" && r.details?.error === "DeviceNotRegistered" ? user.pushTokens[i].token : null))
    .filter((t): t is string => Boolean(t));
  if (dead.length) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
}

export async function notifyUser(userId: string, type: NotificationType, content: string, data: Record<string, string> = {}) {
  await prisma.notification.create({ data: { userId, type, content } });

  try {
    await sendPush(userId, content, { type, ...data });
  } catch {
    // push indisponible : la notification reste visible dans l'app
  }

  const template = EMAIL_TEMPLATES[type];
  if (!template) return; // pas de gabarit email pour ce type -> in-app + push seulement

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, notifyEmail: true },
  });
  if (!user || !user.notifyEmail) return;

  const { subject, html } = template();
  await sendEmail(user.email, subject, html);
}

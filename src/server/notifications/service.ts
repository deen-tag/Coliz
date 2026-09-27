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

export async function notifyUser(userId: string, type: NotificationType, content: string) {
  await prisma.notification.create({ data: { userId, type, content } });

  const template = EMAIL_TEMPLATES[type];
  if (!template) return; // pas de gabarit email pour ce type -> in-app seulement

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, notifyEmail: true },
  });
  if (!user || !user.notifyEmail) return;

  const { subject, html } = template();
  await sendEmail(user.email, subject, html);

  // TODO : push web/mobile — brancher un provider (OneSignal, FCM) et respecter
  // `notifyPush` de la même façon que `notifyEmail` ci-dessus.
}

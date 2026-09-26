import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM ?? "Coliz <notifications@coliz.app>";

export async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    // Pas de clé configurée (dev local) : on log au lieu d'échouer bruyamment.
    console.log(`[email désactivé] À: ${to} — Sujet: ${subject}`);
    return { skipped: true };
  }
  return resend.emails.send({ from: FROM, to, subject, html });
}

// Gabarits minimalistes — un email = une action, pas de newsletter interne.
export const emailTemplates = {
  bookingRequested: () => ({
    subject: "Nouvelle demande de réservation sur Coliz",
    html: `<p>Vous avez reçu une nouvelle demande de réservation pour votre trajet.</p>
           <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Voir sur Coliz</a></p>`,
  }),
  paymentConfirmed: () => ({
    subject: "Paiement confirmé — Coliz",
    html: `<p>Votre paiement a bien été confirmé. Votre colis est en route vers son voyageur.</p>`,
  }),
  deliveryConfirmed: () => ({
    subject: "Votre colis a été livré — Coliz",
    html: `<p>Bonne nouvelle : votre colis a été marqué comme livré. Pensez à laisser un avis !</p>`,
  }),
  incidentReported: () => ({
    subject: "Un incident a été signalé — Coliz",
    html: `<p>Un incident a été signalé sur l'une de vos réservations. Notre équipe va l'examiner.</p>`,
  }),
};

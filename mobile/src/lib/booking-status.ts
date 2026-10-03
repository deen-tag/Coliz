// Langage commun des réservations : ce qui se passe, qui doit agir, ce qui vient ensuite.
// Utilisé par la page de réservation, le suivi, l'Activité et les listes,
// pour que le même statut soit toujours expliqué de la même façon.

export type BookingRole = "sender" | "traveler";
export type Tone = "neutral" | "info" | "success" | "warning" | "error";

export type BookingStatusInfo = {
  title: string;
  hint: string;
  tone: Tone;
  // Vrai quand c'est à cette personne d'agir.
  actionNeeded: boolean;
};

export function bookingStatusInfo(status: string, role: BookingRole, name = "l'autre personne"): BookingStatusInfo {
  const sender = role === "sender";
  switch (status) {
    case "REQUESTED":
      return sender
        ? { title: `En attente de ${name}`, hint: "Vous serez prévenu dès sa réponse. Aucun paiement n'est demandé pour l'instant.", tone: "warning", actionNeeded: false }
        : { title: "Une demande attend votre réponse", hint: `${name} souhaite envoyer un colis avec vous. Vous pouvez accepter, refuser ou proposer un autre prix.`, tone: "warning", actionNeeded: true };
    case "ACCEPTED":
    case "PAYMENT_PENDING":
      return sender
        ? { title: `${name} a accepté`, hint: "Payez pour confirmer la réservation. Votre argent reste bloqué jusqu'à la remise du colis.", tone: "info", actionNeeded: true }
        : { title: `En attente du paiement de ${name}`, hint: "Vous serez prévenu dès que la réservation est confirmée.", tone: "info", actionNeeded: false };
    case "CONFIRMED":
      return sender
        ? { title: "Réservation confirmée", hint: `Au moment de remettre le colis, donnez votre code de remise à ${name}.`, tone: "success", actionNeeded: true }
        : { title: "Réservation confirmée", hint: `Récupérez le colis auprès de ${name} et saisissez le code de remise qu'il vous donne.`, tone: "success", actionNeeded: true };
    case "PICKED_UP":
      return sender
        ? { title: "Colis pris en charge", hint: `${name} transporte votre colis.`, tone: "info", actionNeeded: false }
        : { title: "Colis en votre possession", hint: "À l'arrivée, demandez le code de réception à la personne qui reçoit le colis et saisissez-le.", tone: "info", actionNeeded: true };
    // Anciennes réservations, créées avant les codes : pas de code à saisir.
    case "IN_PROGRESS":
      return { title: "Colis en cours de transport", hint: sender ? `${name} transporte votre colis.` : "Le colis est en cours de transport.", tone: "info", actionNeeded: false };
    case "DELIVERED":
      return { title: "Colis livré", hint: sender ? "La livraison est confirmée." : "La livraison est confirmée. Votre rémunération sera versée à la finalisation.", tone: "success", actionNeeded: false };
    case "DELIVERY_FAILED":
      return { title: "Livraison non finalisée", hint: "Le colis reste avec le voyageur et un incident a été ouvert.", tone: "warning", actionNeeded: false };
    case "COMPLETED":
      return { title: "Terminé", hint: sender ? "Le colis est livré. Votre avis aide les prochains utilisateurs." : "Le colis est livré et vous êtes rémunéré. Merci !", tone: "success", actionNeeded: false };
    case "CANCELLED":
      return { title: "Réservation annulée", hint: "Cette réservation n'est plus active.", tone: "error", actionNeeded: false };
    case "INCIDENT":
      return { title: "Incident signalé", hint: "Un incident est ouvert sur cette réservation.", tone: "error", actionNeeded: false };
    default:
      return { title: status, hint: "", tone: "neutral", actionNeeded: false };
  }
}

// Statuts de réservation à partir du paiement (ParcelStatus a IN_TRANSIT / ARRIVED,
// mais une réservation passe directement de PICKED_UP à DELIVERED).
export const PAID_STATUSES = ["CONFIRMED", "PICKED_UP", "IN_PROGRESS", "DELIVERED", "DELIVERY_FAILED", "COMPLETED"];

// Où mène une réservation : le suivi une fois payée, la page de réservation avant.
export function bookingHref(b: { id: string; status: string }) {
  return PAID_STATUSES.includes(b.status) ? `/suivi/${b.id}` : `/reservations/${b.id}`;
}

// "À venir" = encore en cours ; "Historique" = terminée ou annulée.
export function isPastBooking(status: string) {
  return status === "COMPLETED" || status === "CANCELLED";
}

// Étapes du suivi. Chaque étape correspond à un vrai statut de réservation :
// REQUESTED → ACCEPTED / PAYMENT_PENDING → CONFIRMED → PICKED_UP → DELIVERED → COMPLETED.
const MAIN_STEPS = [
  { label: "Demande envoyée", note: "Le voyageur a reçu la demande." },
  { label: "Demande acceptée", note: "Le prix est convenu." },
  { label: "Payé", note: "L'argent est bloqué jusqu'à la remise." },
  { label: "Colis pris en charge", note: "Le voyageur a le colis." },
  { label: "Livré", note: "Le code de réception est validé." },
  { label: "Terminé", note: "Le voyageur est rémunéré." },
];

export type TrackingTimeline = {
  steps: { label: string; note?: string }[];
  // Index de l'étape en cours ; égal à steps.length quand tout est terminé.
  current: number;
  warning: boolean;
};

// Renvoie null quand la progression n'est pas connue (annulation, incident signalé
// à n'importe quel moment) : le bandeau de statut explique alors la situation.
export function trackingTimeline(status: string): TrackingTimeline | null {
  const steps = MAIN_STEPS;
  switch (status) {
    case "REQUESTED":
      return { steps, current: 0, warning: false };
    case "ACCEPTED":
    case "PAYMENT_PENDING":
      return { steps, current: 1, warning: false };
    case "CONFIRMED":
      return { steps, current: 2, warning: false };
    case "PICKED_UP":
      return { steps, current: 3, warning: false };
    // Anciennes réservations : on sait que le colis circule, pas si la prise en charge a été validée.
    case "IN_PROGRESS":
      return {
        steps: steps.map((st, i) => (i === 3 ? { label: "Colis en transport", note: "Le colis est en route." } : st)),
        current: 3,
        warning: false,
      };
    case "DELIVERED":
      return { steps, current: 4, warning: false };
    case "COMPLETED":
      return { steps, current: steps.length, warning: false };
    // Branche à part : la livraison n'a pas abouti, il n'y a ni "Livré" ni "Terminé".
    case "DELIVERY_FAILED":
      return {
        steps: [
          ...steps.slice(0, 4),
          { label: "Livraison non finalisée", note: "Le colis reste avec le voyageur. Un incident a été ouvert." },
        ],
        current: 4,
        warning: true,
      };
    default:
      return null;
  }
}

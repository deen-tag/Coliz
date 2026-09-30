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
    case "IN_PROGRESS":
    case "IN_TRANSIT":
      return sender
        ? { title: "Colis pris en charge", hint: `${name} transporte votre colis.`, tone: "info", actionNeeded: false }
        : { title: "Colis en votre possession", hint: "À l'arrivée, demandez le code de réception à la personne qui reçoit le colis et saisissez-le.", tone: "info", actionNeeded: true };
    case "ARRIVED":
      return sender
        ? { title: "Colis arrivé à destination", hint: "Le colis va être remis à son destinataire.", tone: "info", actionNeeded: false }
        : { title: "Vous êtes arrivé", hint: "Saisissez le code de réception pour finaliser la livraison.", tone: "info", actionNeeded: true };
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

const PAID_STATUSES = ["CONFIRMED", "PICKED_UP", "IN_PROGRESS", "IN_TRANSIT", "ARRIVED", "DELIVERED", "DELIVERY_FAILED", "COMPLETED"];

// Où mène une réservation : le suivi une fois payée, la page de réservation avant.
export function bookingHref(b: { id: string; status: string }) {
  return PAID_STATUSES.includes(b.status) ? `/suivi/${b.id}` : `/reservations/${b.id}`;
}

// "À venir" = encore en cours ; "Historique" = terminée ou annulée.
export function isPastBooking(status: string) {
  return status === "COMPLETED" || status === "CANCELLED";
}

// Étapes du suivi, dans l'ordre. Chaque statut correspond à une étape.
export const TRACKING_STEPS = [
  { key: "requested", label: "Demande envoyée", done: "Le voyageur a reçu votre demande." },
  { key: "accepted", label: "Demande acceptée", done: "Le prix est convenu." },
  { key: "paid", label: "Payé", done: "L'argent est bloqué jusqu'à la remise." },
  { key: "picked", label: "Colis pris en charge", done: "Le voyageur a le colis." },
  { key: "delivered", label: "Livré", done: "Le code de réception est validé." },
  { key: "completed", label: "Terminé", done: "Le voyageur est rémunéré." },
] as const;

export function trackingStepIndex(status: string): number {
  switch (status) {
    case "REQUESTED":
      return 0;
    case "ACCEPTED":
    case "PAYMENT_PENDING":
      return 1;
    case "CONFIRMED":
      return 2;
    case "PICKED_UP":
    case "IN_PROGRESS":
    case "IN_TRANSIT":
    case "ARRIVED":
    case "DELIVERY_FAILED":
      return 3;
    case "DELIVERED":
      return 4;
    case "COMPLETED":
      return 5;
    default:
      return 0;
  }
}

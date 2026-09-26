import type { User } from "@prisma/client";

// Le badge "Profil vérifié" affiché à l'écran ne doit JAMAIS être un simple
// "vrai/faux" basé sur Stripe. On expose ici le détail par type de vérification,
// et l'UI décide comment l'afficher (ex: 3 pastilles distinctes + un badge
// global uniquement si identité ET email sont vérifiés).
export interface VerificationSummary {
  email: boolean;
  phone: boolean;
  identity: boolean;
  isFullyVerified: boolean; // identité + email, seuil retenu pour le badge "Profil vérifié"
}

export function getVerificationSummary(user: Pick<User, "emailVerifiedAt" | "phoneVerifiedAt" | "identityVerifiedAt">): VerificationSummary {
  const email = Boolean(user.emailVerifiedAt);
  const phone = Boolean(user.phoneVerifiedAt);
  const identity = Boolean(user.identityVerifiedAt);
  return {
    email,
    phone,
    identity,
    // Le seuil du badge est une décision produit explicite, pas une conséquence
    // automatique de l'intégration Stripe Identity.
    isFullyVerified: email && identity,
  };
}

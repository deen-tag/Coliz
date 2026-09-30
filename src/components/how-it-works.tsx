"use client";

import { useState } from "react";

type Role = "sender" | "traveler";

const STEPS: Record<Role, { title: string; text: string }[]> = {
  sender: [
    { title: "Recherchez", text: "Départ, destination et période : Coliz trouve les trajets compatibles." },
    { title: "Comparez", text: "Plusieurs possibilités : prix, délai, mode de transport et transporteur." },
    { title: "Réservez", text: "Paiement sécurisé, commission Coliz incluse dans le prix." },
    { title: "Suivez", text: "Messagerie et suivi jusqu'à la remise du colis." },
  ],
  traveler: [
    { title: "Publiez", text: "Votre trajet, la place disponible et ce que vous souhaitez recevoir." },
    { title: "Choisissez", text: "Vous acceptez ou refusez chaque demande, ou proposez un autre prix." },
    { title: "Transportez", text: "Un code confirme la remise du colis, puis sa réception à l'arrivée." },
    { title: "Soyez payé", text: "Votre contribution vous est versée une fois la livraison confirmée." },
  ],
};

const TAB_LABEL: Record<Role, string> = {
  sender: "J'envoie un colis",
  traveler: "Je voyage",
};

// « Comment ça marche » en deux parcours : chacun voit ses propres étapes, dans sa couleur.
export function HowItWorks() {
  const [role, setRole] = useState<Role>("sender");

  return (
    <div data-role={role}>
      <div
        role="tablist"
        aria-label="Choisir votre situation"
        className="mx-auto mb-8 flex max-w-sm rounded-control border border-line bg-surface p-1"
      >
        {(["sender", "traveler"] as const).map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            data-role={r}
            onClick={() => setRole(r)}
            className={`flex-1 rounded-[10px] py-2.5 text-sm font-medium transition-colors ${
              role === r ? "bg-primary text-white" : "text-ink-muted"
            }`}
          >
            {TAB_LABEL[r]}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="grid sm:grid-cols-4 gap-5 sm:gap-6">
        {STEPS[role].map((s, i) => (
          <div key={s.title} className="flex items-start gap-4 sm:flex-col sm:items-center sm:text-center">
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-semibold shrink-0 sm:mb-1">
              {i + 1}
            </div>
            <div>
              <p className="font-medium text-ink mb-0.5">{s.title}</p>
              <p className="text-sm text-ink-muted leading-snug">{s.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

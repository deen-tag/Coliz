import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Couleur d'accent de la page : suit le rôle de la personne (voir globals.css).
        // Bleu Coliz = expéditeur (par défaut), teal = voyageur. Tous les composants
        // qui utilisent primary / primary-light changent donc de couleur d'un seul coup.
        primary: "rgb(var(--accent) / <alpha-value>)",
        "primary-light": "rgb(var(--accent-light) / <alpha-value>)",
        // Couleurs fixes des deux rôles, pour les écrans qui montrent les deux côte à côte
        // (accueil, tableau de bord, raccourcis).
        sender: "#2457FF",
        "sender-light": "#EAF0FF",
        traveler: "#0A7B71",
        "traveler-light": "#E3F5F2",
        // Deep Ink — remplace le noir pur pour titres/texte fort (DA §3)
        ink: "#101828",
        // Slate — texte secondaire/métadonnées (DA §3)
        "ink-muted": "#667085",
        // Warm White — fond principal éditorial (homepage, sections) (DA §3)
        warm: "#F8F7F3",
        surface: "#FFFFFF",
        "surface-alt": "#F8F7F3",
        // Soft Gray — bordures discrètes (DA §3/§7)
        line: "#E4E7EC",
        success: "#16A34A",
        "success-light": "#E9F7EF",
        warning: "#D97706",
        "warning-light": "#FDF3E7",
        error: "#DC2626",
        "error-light": "#FCEAEA",
      },
      borderRadius: {
        card: "20px",
        control: "12px",
        block: "24px",
      },
      fontFamily: {
        sans: ["Inter", "Manrope", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

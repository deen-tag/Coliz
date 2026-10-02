import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Couleur d'accent : bleu pétrole Coliz = marque et expéditeur (par défaut, partout).
        // Cuivre = voyageur, réservé aux éléments qui portent explicitement data-role="traveler"
        // (onglet, carte, badge, gain) : un accent chaud, pas la couleur de toute la page.
        primary: "rgb(var(--accent) / <alpha-value>)",
        "primary-light": "rgb(var(--accent-light) / <alpha-value>)",
        // Couleurs fixes des deux rôles, pour les écrans qui montrent les deux côte à côte
        // (accueil, tableau de bord, raccourcis).
        sender: "#1B5E6E",
        "sender-light": "#E3EEF1",
        traveler: "#A9501E",
        "traveler-light": "#FAEBDF",
        // Deep Ink — remplace le noir pur pour titres/texte fort (DA §3)
        ink: "#14262D",
        // Slate — texte secondaire/métadonnées (DA §3)
        "ink-muted": "#5B6770",
        // Warm White — fond principal éditorial (homepage, sections) (DA §3)
        warm: "#FAF8F4",
        surface: "#FFFFFF",
        "surface-alt": "#FAF8F4",
        // Soft Gray — bordures discrètes (DA §3/§7)
        line: "#E5E2DA",
        success: "#16A34A",
        "success-light": "#E9F7EF",
        warning: "#D97706",
        "warning-light": "#FDF3E7",
        error: "#DC2626",
        "error-light": "#FCEAEA",
      },
      boxShadow: { card: "0 12px 30px -20px rgba(20,38,45,0.45)" },
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

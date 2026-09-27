import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Coliz Blue — CTA, liens actifs, marque (DA §3)
        primary: "#2457FF",
        "primary-light": "#EAF0FF",
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
        // Teal — accent secondaire à utiliser avec parcimonie (DA §3)
        teal: "#12B8A6",
        "teal-light": "#E4F8F6",
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

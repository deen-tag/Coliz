// Identité visuelle reprise de tailwind.config.ts du site : bleu pétrole (marque / expéditeur),
// cuivre (voyageur, accent uniquement), blanc chaud, encre.
export const colors = {
  primary: "#1B5E6E",
  primaryLight: "#E3EEF1",
  primaryGradientStart: "#2B8AA0",
  traveler: "#A9501E",
  travelerLight: "#FAEBDF",
  ink: "#14262D",
  muted: "#5B6770",
  placeholder: "#9AA5AB",
  pressed: "#F4F1EA",
  track: "#EFEBE3",
  neutralBg: "#EEF0F1",
  bg: "#FAF8F4",
  surface: "#FFFFFF",
  line: "#E5E2DA",
  success: "#16A34A",
  successLight: "#E9F7EF",
  warning: "#D97706",
  warningLight: "#FDF3E7",
  error: "#DC2626",
  errorLight: "#FCEAEA",
  overlay: "rgba(20,38,45,0.45)",
};

export const radius = { control: 12, card: 20, block: 24, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const shadow = {
  shadowColor: "#14262D",
  shadowOpacity: 0.12,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

export const font = {
  regular: { fontWeight: "400" as const },
  medium: { fontWeight: "500" as const },
  semibold: { fontWeight: "600" as const },
  bold: { fontWeight: "700" as const },
};

// Taille minimale d'une zone tactile (recommandation Apple 44pt / Google 48dp).
export const TOUCH = 48;

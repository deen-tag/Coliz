import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "Coliz — Vos colis voyagent avec ceux qui voyagent",
  description:
    "Coliz met en relation des expéditeurs et des voyageurs pour l'envoi de colis. Simple, pratique et accessible.",
  icons: { icon: "/brand/favicon.svg" },
};

// Barre du navigateur mobile aux couleurs de la marque (bleu pétrole).
export const viewport: Viewport = { themeColor: "#1B5E6E" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

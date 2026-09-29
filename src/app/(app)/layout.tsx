import { AppShell } from "@/components/app-shell";

// Shell de l'espace applicatif : la navigation s'adapte à l'état de connexion
// (visiteur = navigation publique, connecté = navigation complète).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

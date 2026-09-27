import { HeaderNav } from "@/components/header-nav";
import { BottomNav } from "@/components/bottom-nav";

// Shell de l'espace connecté : navigation globale cohérente, présente sur
// toutes les pages de ce groupe plutôt que dépendante du bouton retour
// navigateur (brief UI/UX §4). Chaque page garde son propre fond/scroll ;
// ce layout n'ajoute que la navigation et l'espace nécessaire pour ne pas
// être masqué par la barre mobile fixe.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeaderNav />
      <div className="pb-20 md:pb-0">{children}</div>
      <BottomNav />
    </>
  );
}

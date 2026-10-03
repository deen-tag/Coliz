import { router } from "expo-router";
import { EmptyState } from "@/components/ui";
import { Screen } from "@/components/Screen";

export default function NotFound() {
  return (
    <Screen scroll={false}>
      <EmptyState icon="compass-outline" title="Cette page n'existe pas" text="Le lien est peut-être périmé." action={{ label: "Retour à l'accueil", onPress: () => router.replace("/(tabs)") }} />
    </Screen>
  );
}

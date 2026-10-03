import React from "react";
import { router, usePathname } from "expo-router";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "./ui";
import { Screen } from "./Screen";
import type { IconName } from "./ui";

// Les écrans qui demandent un compte affichent ceci aux visiteurs (comme le site : on ne se connecte qu'au moment d'agir).
export function RequireAuth({ children, title, text, icon = "person-circle-outline" }: { children: React.ReactNode; title: string; text: string; icon?: IconName }) {
  const { user } = useAuth();
  const path = usePathname();
  if (user) return <>{children}</>;
  return (
    <Screen scroll={false} topInset>
      <EmptyState icon={icon} title={title} text={text} action={{ label: "Se connecter", onPress: () => router.push({ pathname: "/(auth)/login", params: { next: path } }) }} />
    </Screen>
  );
}

export function goLogin(next: string) {
  router.push({ pathname: "/(auth)/login", params: { next } });
}

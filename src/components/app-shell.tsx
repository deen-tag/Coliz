"use client";

import { useSession } from "next-auth/react";
import { HeaderNav } from "@/components/header-nav";
import { BottomNav } from "@/components/bottom-nav";
import { BackBar } from "@/components/back-bar";
import { PublicHeader } from "@/components/public-header";
import { RoleProvider } from "@/components/role-scope";

// Coquille des pages "de l'appli" : le visiteur (recherche, trajet, profil voyageur)
// et l'utilisateur connecté partagent les mêmes pages mais pas la même navigation.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <ShellContent>{children}</ShellContent>
    </RoleProvider>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status === "authenticated") {
    return (
      <>
        <HeaderNav />
        <div className="pb-20 md:pb-0">
          <BackBar />
          {children}
        </div>
        <BottomNav />
      </>
    );
  }

  if (status === "unauthenticated") {
    return (
      <>
        <PublicHeader />
        <BackBar visitor />
        {children}
      </>
    );
  }

  // Session en cours de lecture : on réserve la place de l'en-tête pour éviter un saut de page.
  return (
    <>
      <div className="h-16" aria-hidden />
      {children}
    </>
  );
}

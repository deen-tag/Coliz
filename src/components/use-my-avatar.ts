"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Photo de l'utilisateur connecté. Même clé SWR que la page Paramètres :
// quand la photo change là-bas, la navigation se met à jour toute seule.
export function useMyAvatar() {
  const { data } = useSWR("/api/settings", fetcher, { revalidateOnFocus: false });
  return {
    avatarUrl: (data?.avatarUrl as string | null | undefined) ?? null,
    firstName: (data?.firstName as string | null | undefined) ?? null,
  };
}

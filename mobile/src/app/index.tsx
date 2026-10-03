import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { user, prefs } = useAuth();
  if (!user && !prefs.onboardingDone) return <Redirect href="/welcome" />;
  return <Redirect href="/(tabs)" />;
}

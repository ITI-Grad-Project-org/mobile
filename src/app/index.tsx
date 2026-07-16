import { Redirect } from "expo-router";
import { useAuth } from "@/shared/hooks/useAuth";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";

export default function Index() {
  const { isAuthenticated, persona, profileCompleted } = useAuth();
  const { tenantId, role } = useActiveTenant();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!tenantId) {
    if (persona === "coach") {
      if (profileCompleted) {
        return <Redirect href="/(coach)/(tabs)/home" />;
      }
      return <Redirect href="/(setup)/coach-profile" />;
    }
    return <Redirect href="/(onboarding)/onboarding" />;
  }

  return (
    <Redirect
      href={
        role === "owner" || persona === "coach"
          ? "/(coach)/(tabs)/home"
          : "/(client)/(tabs)/today"
      }
    />
  );
}




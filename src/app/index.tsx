import { Redirect } from "expo-router";
import { useAuth } from "@/shared/hooks/useAuth";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";

export default function Index() {
  const { isAuthenticated, persona, profileCompleted } = useAuth();
  const { tenantId, role } = useActiveTenant();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!profileCompleted) {
    if (persona === "coach" || role === "owner") {
      return <Redirect href="/(setup)/coach-profile" />;
    }
    return <Redirect href="/(setup)/client-profile" />;
  }

  if (persona === "coach" || role === "owner") {
    return <Redirect href="/(coach)/(tabs)/home" />;
  }

  if (!tenantId) {
    return <Redirect href="/(setup)/match-coach" />;
  }

  return <Redirect href="/(client)/(tabs)/today" />;
}




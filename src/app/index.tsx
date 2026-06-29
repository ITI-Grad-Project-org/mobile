import { Redirect } from "expo-router";

import { useRole } from "@/shared/hooks/useRole";

export default function Index() {
  const role = useRole();

  if (!role) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Redirect
      href={
        role === "owner"
          ? "/(coach)/(tabs)/home"
          : "/(client)/(tabs)/today"
      }
    />
  );
}

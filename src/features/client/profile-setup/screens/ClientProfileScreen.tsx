import { useLocalSearchParams, useRouter } from "expo-router";

import { SignupFlow, type ProfileData } from "@/features/shared/setup";
import { CLIENT_STEPS } from "../config";

export function ClientProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    fname?: string;
    lname?: string;
  }>();

  const initialData: ProfileData = {
    fname: params.fname ?? "",
    lname: params.lname ?? "",
    email: params.email ?? "",
  };

  const done = (data: ProfileData) => {
    // Carry the collected goal into matching so it can pick a relevant coach.
    const goals = Array.isArray(data.goal) ? (data.goal as string[]) : [];
    router.replace({
      pathname: "/(setup)/match-coach",
      params: goals.length ? { goal: goals[0] } : undefined,
    });
  };

  return (
    <SignupFlow
      title="Client profile"
      steps={CLIENT_STEPS}
      initialData={initialData}
      onClose={() => router.replace("/(client)/(tabs)/today")}
      onDone={done}
      welcomeTitle="You're all set."
      welcomeBody="Profile saved. Let's get you matched with the right coach."
    />
  );
}

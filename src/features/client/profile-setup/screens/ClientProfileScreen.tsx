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

  const done = () => {
    // Profile saved — move on to coach matching.
    router.replace("/(setup)/match-coach");
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

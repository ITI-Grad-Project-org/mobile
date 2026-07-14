import { useLocalSearchParams, useRouter } from "expo-router";

import { SignupFlow, type ProfileData } from "@/features/shared/setup";
import { markProfileComplete } from "@/shared/hooks/useProfileSetup";
import { COACH_STEPS } from "../config";

export function CoachProfileScreen() {
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

  const enterApp = () => router.replace("/(coach)/(tabs)/home");

  const done = async (data: ProfileData) => {
    await markProfileComplete(data);
    enterApp();
  };

  return (
    <SignupFlow
      title="Coach profile"
      steps={COACH_STEPS}
      initialData={initialData}
      onClose={enterApp}
      onDone={done}
      welcomeTitle="Profile ready."
      welcomeBody="Your coaching profile is set up. Let's get to work."
    />
  );
}

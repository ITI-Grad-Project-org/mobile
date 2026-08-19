import { useLocalSearchParams, useRouter } from "expo-router";

import { OnboardingScreen } from "@/features/client/onboarding";
import { markOnboarded } from "@/shared/hooks/useOnboarding";
import { View } from "@/tw";

export default function OnboardingRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    fname?: string;
    lname?: string;
  }>();

  const finish = async () => {
    await markOnboarded(params.email);
    router.replace({
      pathname: "/(setup)/client-profile",
      params: {
        email: params.email,
        fname: params.fname,
        lname: params.lname,
      },
    });
  };

  return (
    <View className="flex-1 bg-background">
      <OnboardingScreen onFinish={finish} onSkip={finish} />
    </View>
  );
}

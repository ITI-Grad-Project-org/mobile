import { useRouter } from "expo-router";

import { OnboardingScreen } from "@/features/client/onboarding";
import { markOnboarded } from "@/shared/hooks/useOnboarding";
import { View } from "@/tw";

export default function OnboardingRoute() {
  const router = useRouter();

  const finish = async () => {
    await markOnboarded();
    router.replace("/(setup)/client-profile");
  };

  return (
    <View className="flex-1 bg-background">
      <OnboardingScreen onFinish={finish} onSkip={finish} />
    </View>
  );
}

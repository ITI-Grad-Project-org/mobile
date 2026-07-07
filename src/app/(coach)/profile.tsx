import { ProfileScreen } from "@/features/shared/profile";
import { View } from "@/tw";

export default function CoachProfileRoute() {
  return (
    <View className="flex-1 bg-background px-4">
      <ProfileScreen />
    </View>
  );
}

import { HomeScreen } from "@/features/coach/home";
import { View } from "@/tw";

export default function CoachHomeRoute() {
  // No horizontal padding here: the screen pads its own scroll content so the
  // pull-to-refresh spinner and the scroll indicator span the full width.
  return (
    <View className="flex-1 bg-background">
      <HomeScreen />
    </View>
  );
}

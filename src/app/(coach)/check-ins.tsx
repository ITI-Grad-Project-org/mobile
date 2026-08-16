import { CheckinsScreen } from "@/features/coach/checkins";
import { View } from "@/tw";

export default function CoachCheckinsRoute() {
  return (
    <View className="flex-1 bg-background">
      <CheckinsScreen />
    </View>
  );
}

import { ProgressScreen } from "@/features/client/progress";
import { View } from "@/tw";

export default function ClientProgressRoute() {
  return (
    <View className="flex-1 bg-background px-4">
      <ProgressScreen />
    </View>
  );
}


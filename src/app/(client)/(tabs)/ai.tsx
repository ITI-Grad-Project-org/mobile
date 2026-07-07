import { AssistantScreen } from "@/features/client/assistant";
import "@/global.css";
import { View } from "@/tw";

export default function ClientAIRoute() {
  return (
    <View className="flex-1 bg-background">
      <AssistantScreen />
    </View>
  );
}

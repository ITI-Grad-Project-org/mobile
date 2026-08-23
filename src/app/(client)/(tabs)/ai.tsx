import { AssistantScreen } from "@/features/client/assistant";
import "@/global.css";
import { View } from "@/tw";

export default function ClientAIRoute() {
  return (
    // pb-pinned-tabbar, not pb-tabbar: the composer is pinned to the bottom of
    // this container, so the container itself has to clear the iOS tab bar.
    <View className="flex-1 bg-background px-4 pb-pinned-tabbar">
      <AssistantScreen />
    </View>
  );
}

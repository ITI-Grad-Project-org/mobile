import { ClientAIScreen } from "@/features/assistant";
import "@/global.css";
import { View } from "@/tw";

export default function ClientChatScreen() {
  return <View className="flex-1 bg-background px-4">
    <ClientAIScreen />
  </View>
}


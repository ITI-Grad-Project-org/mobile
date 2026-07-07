import { ChatScreen } from "@/features/client/chat";
import { View } from "@/tw";

export default function ClientChatRoute() {
  return (
    <View className="flex-1 bg-background px-4">
      <ChatScreen />
    </View>
  );
}



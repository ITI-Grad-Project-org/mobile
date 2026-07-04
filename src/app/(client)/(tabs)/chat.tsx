import { ClientChatScreen } from "@/features/messaging";
import { View } from "@/tw";

export default function ClientChatRoute() {
  return (
    <View className="flex-1 bg-background px-4">
      <ClientChatScreen />
    </View>
  );
}



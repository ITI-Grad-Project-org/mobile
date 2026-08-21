import { ConversationScreen } from "@/features/coach/inbox";
import { View } from "@/tw";
import { useLocalSearchParams } from "expo-router";

export default function CoachChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View className="flex-1 bg-background px-4">
      <ConversationScreen clientId={id} />
    </View>
  );
}


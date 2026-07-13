import { ConversationScreen } from "@/features/coach/inbox";
import { useLocalSearchParams } from "expo-router";

export default function CoachChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ConversationScreen clientId={id} />;
}

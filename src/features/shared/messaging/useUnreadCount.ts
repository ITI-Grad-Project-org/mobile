import {
  MESSAGES_PAGE_SIZE,
  useGetConversationsQuery,
  useGetMyMessagesQuery,
} from "@/api/endpoints/chat.endpoints";
import { useChatRole } from "./useChatRole";

export function useUnreadCount(): number {
  const { tenantId, isCoach, canChat, mySide } = useChatRole();
  const enabled = Boolean(tenantId) && canChat;

  const { data: conversations } = useGetConversationsQuery(
    { tenantId: tenantId! },
    { skip: !enabled || !isCoach }
  );
  const { data: myMessages } = useGetMyMessagesQuery(
    { tenantId: tenantId!, limit: MESSAGES_PAGE_SIZE },
    { skip: !enabled || isCoach }
  );

  if (!enabled) return 0;

  if (isCoach) {
    return (conversations ?? []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }
  // The client's summary isn't served as a count, so derive it from the thread.
  return (myMessages ?? []).filter((m) => m.senderType !== mySide && !m.readAt).length;
}

import {
  connectChatSocket,
  disconnectChatSocket,
  onChatConnectionChange,
  onChatSocketChange,
} from "@/lib/chatSocket";
import { useAppDispatch, useAppSelector } from "@/store";
import { CLIENT_THREAD, setChatConnected, setOpenThread, setTyping } from "@/store/chatUiSlice";
import { useEffect, useRef, useState } from "react";
import { bumpConversation, markOutboundRead, upsertMessage } from "./cache";
import type { Message, SenderType } from "./types";
import { useChatRole } from "./useChatRole";

/** A `typing: true` with no matching `false` shouldn't hang the indicator. */
const TYPING_EXPIRY_MS = 6000;

export function useChatEvents() {
  const dispatch = useAppDispatch();
  const { tenantId, isCoach, mySide, canChat, isAuthenticated } = useChatRole();
  const openClientId = useAppSelector((s) => s.chatUi.openClientId);

  // Read inside listeners without re-subscribing on every thread change.
  const openRef = useRef(openClientId);
  useEffect(() => {
    openRef.current = openClientId;
  }, [openClientId]);

  // Handlers bind to a specific Socket instance, so a replaced socket (tenant
  // switch, forced re-auth) has to re-bind them.
  const [epoch, setEpoch] = useState(0);
  useEffect(() => onChatSocketChange(() => setEpoch((e) => e + 1)), []);

  useEffect(() => onChatConnectionChange((c) => dispatch(setChatConnected(c))), [dispatch]);

  const active = isAuthenticated && Boolean(tenantId) && canChat;

  useEffect(() => {
    if (!active || !tenantId) {
      disconnectChatSocket();
      dispatch(setChatConnected(false));
      return;
    }

    let cancelled = false;
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};
    let bound: Awaited<ReturnType<typeof connectChatSocket>> = null;

    const counted = new Set<string>();
    const claimUnread = (id: string | undefined) => {
      if (!id) return true;
      if (counted.has(id)) return false;
      counted.add(id);
      if (counted.size > 300) {
        const oldest = counted.values().next().value;
        if (oldest !== undefined) counted.delete(oldest);
      }
      return true;
    };

    /** Our own sends, and the thread already on screen, never add a badge. */
    const shouldCount = (msg: Message, clientId: string) =>
      msg.senderType !== mySide && openRef.current !== clientId && claimUnread(msg.id);

    const onMessage = (msg: Message) => {
      const clientId = msg.clientId;
      upsertMessage(dispatch, { tenantId, isCoach, clientId }, msg);

      if (isCoach) {
        bumpConversation(dispatch, tenantId, clientId, msg, shouldCount(msg, clientId));
      }
    };

    const onConversationUpdated = ({
      clientId,
      lastMessage,
    }: {
      clientId: string;
      lastMessage: Message;
    }) => {
      if (!isCoach || !lastMessage) return;
      bumpConversation(
        dispatch,
        tenantId,
        clientId,
        lastMessage,
        shouldCount(lastMessage, clientId)
      );
    };

    const onTyping = ({ clientId, isTyping }: { clientId: string; isTyping: boolean }) => {
      const key = isCoach ? clientId : CLIENT_THREAD;
      dispatch(setTyping({ clientId: key, isTyping }));

      clearTimeout(timers[key]);
      if (isTyping) {
        timers[key] = setTimeout(
          () => dispatch(setTyping({ clientId: key, isTyping: false })),
          TYPING_EXPIRY_MS
        );
      }
    };

    const onRead = ({
      clientId,
      reader,
      readAt,
    }: {
      clientId: string;
      reader: SenderType;
      readAt: string;
    }) => {
      markOutboundRead(
        dispatch,
        { tenantId, isCoach, clientId },
        reader,
        readAt ?? new Date().toISOString()
      );
    };

    connectChatSocket().then((socket) => {
      if (cancelled || !socket) return;
      bound = socket;
      socket.on("message:new", onMessage);
      socket.on("conversation:updated", onConversationUpdated);
      socket.on("typing", onTyping);
      socket.on("messages:read", onRead);
    });

    return () => {
      cancelled = true;
      Object.values(timers).forEach(clearTimeout);
      bound?.off("message:new", onMessage);
      bound?.off("conversation:updated", onConversationUpdated);
      bound?.off("typing", onTyping);
      bound?.off("messages:read", onRead);
    };
  }, [active, tenantId, isCoach, mySide, epoch, dispatch]);

  // Tenant switch / logout leaves a stale open thread pointing at the old tenant.
  useEffect(() => {
    if (!active) dispatch(setOpenThread(null));
  }, [active, dispatch]);
}

import {
  MESSAGES_PAGE_SIZE,
  useGetMessagesQuery,
  useGetMyMessagesQuery,
  useMarkMyReadMutation,
  useMarkReadMutation,
  useSendMessageMutation,
  useSendMyMessageMutation,
} from "@/api/endpoints/chat.endpoints";
import { emitAck, emitFireAndForget } from "@/lib/chatSocket";
import { useAppDispatch, useAppSelector } from "@/store";
import { CLIENT_THREAD, setOpenThread } from "@/store/chatUiSlice";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearConversationUnread,
  markInboundRead,
  setPendingStatus,
  upsertMessage,
} from "./cache";
import { threadAllowsChat, type Message } from "./types";
import { useChatRole } from "./useChatRole";

const PAGE_SIZE = MESSAGES_PAGE_SIZE;
/** Stop signalling "typing" once the user pauses. */
const TYPING_IDLE_MS = 2000;

/** RN has no crypto.randomUUID; this only has to be unique per device+thread. */
function newClientMsgId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useChatThread(clientId?: string, threadStatus?: string | null) {
  const dispatch = useAppDispatch();
  const { tenantId, isCoach, mySide, canChat: roleCanChat } = useChatRole();
  const canChat = roleCanChat && (!isCoach || threadAllowsChat(threadStatus));
  const connected = useAppSelector((s) => s.chatUi.connected);
  const typingKey = isCoach ? (clientId ?? "") : CLIENT_THREAD;
  const otherTyping = useAppSelector((s) => Boolean(s.chatUi.typingByClientId[typingKey]));

  const ready = Boolean(tenantId) && canChat && (!isCoach || Boolean(clientId));
  const cacheRef = useMemo(
    () => ({ tenantId: tenantId ?? "", isCoach, clientId }),
    [tenantId, isCoach, clientId]
  );

  const [before, setBefore] = useState<string | undefined>(undefined);
  const [reachedStart, setReachedStart] = useState(false);

  const coachQuery = useGetMessagesQuery(
    { tenantId: tenantId!, clientId: clientId!, before, limit: PAGE_SIZE },
    { skip: !ready || !isCoach }
  );
  const clientQuery = useGetMyMessagesQuery(
    { tenantId: tenantId!, before, limit: PAGE_SIZE },
    { skip: !ready || isCoach }
  );
  const query = isCoach ? coachQuery : clientQuery;

  const messages = useMemo<Message[]>(() => query.data ?? [], [query.data]);

  const [sendMessageRest] = useSendMessageMutation();
  const [sendMyMessageRest] = useSendMyMessageMutation();
  const [markReadRest] = useMarkReadMutation();
  const [markMyReadRest] = useMarkMyReadMutation();

  // ---- Pagination --------------------------------------------------------
  const countBeforeLoad = useRef(0);
  const sawFetch = useRef(false);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);

  const loadEarlier = useCallback(() => {
    if (!ready || reachedStart || isLoadingEarlier || query.isFetching) return;
    if (messages.length === 0) return;
    countBeforeLoad.current = messages.length;
    setIsLoadingEarlier(true);
    setBefore(messages[0].createdAt);
  }, [ready, reachedStart, isLoadingEarlier, query.isFetching, messages]);

  useEffect(() => {
    if (!isLoadingEarlier) return;
    if (query.isFetching) {
      sawFetch.current = true;
      return;
    }
    if (!sawFetch.current) return;
    sawFetch.current = false;
    setIsLoadingEarlier(false);
    // Nothing new merged in — we're at the start of the thread.
    if (messages.length <= countBeforeLoad.current) setReachedStart(true);
  }, [isLoadingEarlier, query.isFetching, messages.length]);

  const threadKey = `${tenantId ?? ""}:${clientId ?? "me"}`;
  const [pagedThread, setPagedThread] = useState(threadKey);
  if (pagedThread !== threadKey) {
    setPagedThread(threadKey);
    setBefore(undefined);
    setReachedStart(false);
  }

  // ---- Thread presence ---------------------------------------------------
  useEffect(() => {
    if (!ready || !isCoach || !clientId || !connected) return;
    emitFireAndForget("conversation:join", { clientId });
    return () => emitFireAndForget("conversation:leave", { clientId });
  }, [ready, isCoach, clientId, connected]);

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      dispatch(setOpenThread(isCoach ? clientId! : CLIENT_THREAD));
      return () => {
        dispatch(setOpenThread(null));
      };
    }, [ready, isCoach, clientId, dispatch])
  );

  // ---- Read receipts -----------------------------------------------------
  const unreadInbound = useMemo(
    () => messages.some((m) => m.senderType !== mySide && !m.readAt),
    [messages, mySide]
  );

  const markRead = useCallback(async () => {
    if (!ready || !tenantId) return;
    const readAt = new Date().toISOString();
    try {
      const ack = await emitAck("messages:read", isCoach ? { clientId } : {});
      if (!ack.ok) return;
    } catch {
      // Socket down — the REST route marks read and broadcasts all the same.
      try {
        if (isCoach) await markReadRest({ tenantId, clientId: clientId! }).unwrap();
        else await markMyReadRest({ tenantId }).unwrap();
      } catch {
        return;
      }
    }
    markInboundRead(dispatch, cacheRef, readAt);
    if (isCoach && clientId) clearConversationUnread(dispatch, tenantId, clientId);
  }, [ready, tenantId, isCoach, clientId, markReadRest, markMyReadRest, dispatch, cacheRef]);

  // Reading is driven by the thread being visible AND something being unread.
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  useEffect(() => {
    if (focused && unreadInbound) void markRead();
  }, [focused, unreadInbound, markRead]);

  // ---- Typing ------------------------------------------------------------
  const typingSent = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!ready) return;
      emitFireAndForget("typing", isCoach ? { clientId, isTyping } : { isTyping });
    },
    [ready, isCoach, clientId]
  );

  const stopTyping = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = null;
    if (typingSent.current) {
      typingSent.current = false;
      emitTyping(false);
    }
  }, [emitTyping]);

  /** Call on every keystroke — the emit itself is debounced to the edges. */
  const notifyTyping = useCallback(() => {
    if (!ready) return;
    if (!typingSent.current) {
      typingSent.current = true;
      emitTyping(true);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  }, [ready, emitTyping, stopTyping]);

  useEffect(() => stopTyping, [stopTyping]);

  // ---- Sending -----------------------------------------------------------
  const threadClientId = clientId ?? messages[0]?.clientId ?? "";

  const deliver = useCallback(
    async (body: string, clientMsgId: string) => {
      if (!tenantId) return;
      try {
        const ack = await emitAck<Message>(
          "message:send",
          isCoach ? { clientId, body, clientMsgId } : { body, clientMsgId }
        );
        if (ack.ok) {
          // Tag the response so it replaces our optimistic bubble rather than
          // arriving alongside it — the server doesn't echo clientMsgId here.
          if (ack.data) upsertMessage(dispatch, cacheRef, { ...ack.data, clientMsgId });
          return;
        }
        // A negative ack is a refusal (inactive relationship, bad body), not a
        // transport failure — REST would fail the same way.
        setPendingStatus(dispatch, cacheRef, clientMsgId, "failed");
        return;
      } catch {
        // Socket down or the ack never landed — fall through to REST.
      }

      try {
        const saved = isCoach
          ? await sendMessageRest({ tenantId, clientId: clientId!, body, clientMsgId }).unwrap()
          : await sendMyMessageRest({ tenantId, body, clientMsgId }).unwrap();
        upsertMessage(dispatch, cacheRef, { ...saved, clientMsgId });
      } catch {
        setPendingStatus(dispatch, cacheRef, clientMsgId, "failed");
      }
    },
    [tenantId, isCoach, clientId, sendMessageRest, sendMyMessageRest, dispatch, cacheRef]
  );

  const send = useCallback(
    async (raw: string) => {
      const body = raw.trim();
      if (!body || !ready || !tenantId) return;
      stopTyping();

      const clientMsgId = newClientMsgId();
      upsertMessage(dispatch, cacheRef, {
        id: `pending:${clientMsgId}`,
        tenantId,
        clientId: threadClientId,
        senderType: mySide,
        body,
        readAt: null,
        createdAt: new Date().toISOString(),
        clientMsgId,
        status: "sending",
      });
      await deliver(body, clientMsgId);
    },
    [ready, tenantId, threadClientId, mySide, deliver, dispatch, cacheRef, stopTyping]
  );

  const retry = useCallback(
    async (msg: Message) => {
      if (!msg.clientMsgId) return;
      setPendingStatus(dispatch, cacheRef, msg.clientMsgId, "sending");
      await deliver(msg.body, msg.clientMsgId);
    },
    [deliver, dispatch, cacheRef]
  );

  return {
    messages,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,

    loadEarlier,
    hasEarlier: !reachedStart && messages.length >= PAGE_SIZE,
    isLoadingEarlier,

    send,
    retry,
    notifyTyping,
    stopTyping,

    otherTyping,
    connected,
    canChat,
    mySide,
  };
}

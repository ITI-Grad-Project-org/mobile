import { chatEndpoints } from "@/api/endpoints/chat.endpoints";
import type { AppDispatch } from "@/store";
import type { ConversationSummary, Message } from "./types";

/** Insert (or reconcile) one message into an oldest→newest draft, in place. */
function upsert(draft: Message[], msg: Message) {
  // The sender's own echo carries the clientMsgId it was sent with: swap the
  // optimistic bubble for the persisted row rather than showing both.
  if (msg.clientMsgId) {
    const pendingIdx = draft.findIndex((m) => m.clientMsgId === msg.clientMsgId);
    if (pendingIdx !== -1) {
      draft[pendingIdx] = msg;
      return;
    }
  }
  // Both parties receive message:new, and REST sends also broadcast, so the
  // same row can arrive twice.
  if (draft.some((m) => m.id === msg.id)) return;

  const at = new Date(msg.createdAt).getTime();
  let i = draft.length;
  while (i > 0 && new Date(draft[i - 1].createdAt).getTime() > at) i -= 1;
  draft.splice(i, 0, msg);
}

interface ThreadRef {
  tenantId: string;
  isCoach: boolean;
  /** Required for the coach; ignored for the client (locked to its own thread). */
  clientId?: string;
}

/** Runs `recipe` against whichever thread cache this role reads from. */
function patchThread(
  dispatch: AppDispatch,
  { tenantId, isCoach, clientId }: ThreadRef,
  recipe: (draft: Message[]) => void
) {
  if (isCoach) {
    if (!clientId) return;
    dispatch(
      chatEndpoints.util.updateQueryData("getMessages", { tenantId, clientId }, recipe)
    );
  } else {
    dispatch(chatEndpoints.util.updateQueryData("getMyMessages", { tenantId }, recipe));
  }
}

export function upsertMessage(dispatch: AppDispatch, ref: ThreadRef, msg: Message) {
  patchThread(dispatch, ref, (draft) => upsert(draft, msg));
}

/** Drops an optimistic bubble that never made it (send failed with no retry). */
export function removePendingMessage(
  dispatch: AppDispatch,
  ref: ThreadRef,
  clientMsgId: string
) {
  patchThread(dispatch, ref, (draft) => {
    const i = draft.findIndex((m) => m.clientMsgId === clientMsgId);
    if (i !== -1) draft.splice(i, 1);
  });
}

/** Flips an optimistic bubble's local delivery state (sending → failed). */
export function setPendingStatus(
  dispatch: AppDispatch,
  ref: ThreadRef,
  clientMsgId: string,
  status: Message["status"]
) {
  patchThread(dispatch, ref, (draft) => {
    const m = draft.find((x) => x.clientMsgId === clientMsgId);
    if (m) m.status = status;
  });
}

/** Marks our own outbound messages as read after a `messages:read` event. */
export function markOutboundRead(
  dispatch: AppDispatch,
  ref: ThreadRef,
  readerType: "coach" | "client",
  readAt: string
) {
  patchThread(dispatch, ref, (draft) => {
    for (const m of draft) {
      // The reader read the OTHER side's messages — i.e. ours.
      if (m.senderType !== readerType && !m.readAt) m.readAt = readAt;
    }
  });
}

/** Clears unread on inbound messages once we've marked the thread read. */
export function markInboundRead(dispatch: AppDispatch, ref: ThreadRef, readAt: string) {
  const mySide = ref.isCoach ? "coach" : "client";
  patchThread(dispatch, ref, (draft) => {
    for (const m of draft) {
      if (m.senderType !== mySide && !m.readAt) m.readAt = readAt;
    }
  });
}

// ---- Coach inbox ---------------------------------------------------------

/** Most-recently-active first; threads with no messages sink to the bottom. */
function sortConversations(list: ConversationSummary[]) {
  list.sort((a, b) => {
    const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bt - at;
  });
}

/**
 * Bumps a thread in the coach's inbox. `incrementUnread` is false when the
 * coach is already looking at that thread (or sent the message themselves).
 */
export function bumpConversation(
  dispatch: AppDispatch,
  tenantId: string,
  clientId: string,
  lastMessage: Message,
  incrementUnread: boolean
) {
  dispatch(
    chatEndpoints.util.updateQueryData("getConversations", { tenantId }, (draft) => {
      const row = draft.find((c) => c.clientId === clientId);
      if (!row) return; // Unknown thread — the next refetch will pick it up.
      row.lastMessage = lastMessage;
      if (incrementUnread) row.unreadCount += 1;
      sortConversations(draft);
    })
  );
}

export function clearConversationUnread(
  dispatch: AppDispatch,
  tenantId: string,
  clientId: string
) {
  dispatch(
    chatEndpoints.util.updateQueryData("getConversations", { tenantId }, (draft) => {
      const row = draft.find((c) => c.clientId === clientId);
      if (row) row.unreadCount = 0;
    })
  );
}

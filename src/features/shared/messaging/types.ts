export type SenderType = "coach" | "client";

/** Local-only delivery state for an optimistic bubble. Absent = persisted. */
export type MessageStatus = "sending" | "failed";

export interface Message {
  id: string;
  tenantId: string;
  /** Identifies the thread. */
  clientId: string;
  senderType: SenderType;
  body: string;
  /** ISO timestamp, or null while unread. */
  readAt: string | null;
  createdAt: string;
  /** Echoed back on `message:new` for the sender only — used to reconcile. */
  clientMsgId?: string;
  /** Client-side only; never sent by the server. */
  status?: MessageStatus;
}

export interface ConversationClient {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface ConversationSummary {
  clientId: string;
  client: ConversationClient | null;
  status: "active" | "paused";
  lastMessage: Message | null;
  /** Client messages the coach hasn't read. */
  unreadCount: number;
}

/** Every socket emit resolves with one of these instead of erroring out. */
export type SocketAck<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Only a confirmed coaching relationship may chat. */
export function canChat(status: string | null | undefined): boolean {
  return status === "active" || status === "paused";
}

const RELATIONSHIP_STATUSES = new Set(["invited", "active", "paused", "removed"]);

export function threadAllowsChat(status: string | null | undefined): boolean {
  if (!status || !RELATIONSHIP_STATUSES.has(status)) return true;
  return canChat(status);
}

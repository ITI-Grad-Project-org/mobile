// Shared messaging data layer — used by both the coach inbox (coach/inbox) and
// the client chat (client/chat). Screens live per-UI; only the data model and
// (future) RTK Query endpoints are shared here.
//
// The coach and client message the same threads against the same tenant-scoped
// endpoints, so the wire types belong in one place.

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface Thread {
  id: string;
  /** The other participant (a client for the coach, the coach for a client). */
  participantId: string;
  lastMessageAt: string;
}

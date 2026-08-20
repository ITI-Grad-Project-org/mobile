// Data-layer barrel (no screens).
//
// There are deliberately no RTK Query endpoints here: the assistant chat path
// is socket-only and stores nothing server-side, so there is nothing to cache
// or invalidate. Transport lives in `@/lib/aiSocket`; the protocol rules live
// in `useAiChat`. See docs/06-Ai-Integration.md.
export {
  MAX_PROMPT_LENGTH,
  type AiAccepted,
  type AiCompleted,
  type AiMessage,
  type AiMessageRole,
  type AiMessageState,
  type AiRejected,
  type AiRequestKind,
  type AiRequestPayload,
  type AiTimedOut,
  type AiUnauthorized,
  type WsException,
} from "./types";
export { useAiChat, useAiEvents } from "./useAiChat";

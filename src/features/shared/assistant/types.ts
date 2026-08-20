/**
 * Wire types for the AI assistant gateway (socket.io v4, default namespace).
 *
 * The assistant is NOT a REST job-ticket API — there is no `POST /assistant/ask`
 * and no job to poll. One `ai.requested` emit is answered out-of-band by a
 * separate `ai.completed` event, and nothing is persisted server-side.
 */

/** Prompts longer than this are rejected by the gateway. */
export const MAX_PROMPT_LENGTH = 4000;

/**
 * Free-text label, not an enum — it is interpolated into the prompt as
 * `=== Request (kind: advice) ===` to nudge the model's register. Keep the
 * vocabulary small so answers stay consistent.
 *
 * Not to be confused with `PlanSuggestionKind` (training/nutrition), which is a
 * strict enum belonging to the plan-suggestion REST API.
 */
export type AiRequestKind = "advice";

// ── client → server ──────────────────────────────────────────────────────────

export interface AiRequestPayload {
  kind: AiRequestKind;
  prompt: string;
  /**
   * Coach only, optional. Set it and retrieval may draw on that one client's
   * intake and check-ins; omit it and the answer is grounded only in the
   * coach's library and the curated corpus. Verified against the DB on every
   * message — a membership outside the caller's tenant is rejected.
   *
   * A client's socket may send this and it is IGNORED (not rejected): a client
   * is always scoped to themselves, resolved from their own token.
   */
  membershipId?: string | null;
  /** Metadata only — echoed back on `ai.completed`, grants no access. */
  clientId?: string | null;
}

// ── server → client ──────────────────────────────────────────────────────────

/** Queued. `requestId` is the ONLY way to correlate the eventual answer. */
export interface AiAccepted {
  requestId: string;
}

export interface AiCompleted {
  requestId: string;
  clientId: string | null;
  coachId: string | null;
  coachEmail: string | null;
  status: "succeeded" | "failed";
  /**
   * On `succeeded`, the assistant's answer as Markdown-flavoured prose.
   *
   * On `failed`, an internal diagnostic of the form
   * `"AI request failed: <exception message>"` — log it, NEVER render it.
   */
  summary: string;
}

/**
 * No answer within `AI_REQUEST_TIMEOUT_MS`. Advisory, NOT final: the work
 * continues and a late `ai.completed` for the same request can still arrive.
 */
export interface AiTimedOut {
  requestId: string;
}

/** Malformed request. Carries no `requestId` — the request never got one. */
export interface AiRejected {
  message: string;
}

/** Token missing/invalid/expired. The socket is closed immediately after. */
export interface AiUnauthorized {
  message: string;
}

/** Unhandled server-side error (e.g. broker unreachable). No `requestId`. */
export interface WsException {
  statusCode: number;
  message: string;
  timestamp: string;
}

// ── local view model ─────────────────────────────────────────────────────────

export type AiMessageRole = "user" | "assistant" | "system";

/**
 * `thinking` covers both waiting-for-`ai.accepted` and waiting-for-
 * `ai.completed`; `slow` is the same wait after an `ai.timed_out` advisory.
 *
 * `stopped` is a purely LOCAL abandon — the gateway has no cancel event, so the
 * work continues and the Gemini call is still billed. It only means the user
 * stopped waiting, which is why it renders neutrally rather than as an error.
 */
export type AiMessageState = "thinking" | "slow" | "failed" | "stopped";

export interface AiMessage {
  id: string;
  role: AiMessageRole;
  text: string;
  state?: AiMessageState;
  /** Set on the assistant placeholder once `ai.accepted` lands. */
  requestId?: string;
  /**
   * Display name of the client this question was scoped to, if any. Recorded
   * on the user's message so a thread covering several clients stays readable
   * — the scope is a per-question choice, not a property of the conversation.
   */
  scopeName?: string;
}

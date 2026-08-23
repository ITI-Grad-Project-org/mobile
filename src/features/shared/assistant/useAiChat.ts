import {
  connectAiSocket,
  disconnectAiSocket,
  emitAiRequest,
  onAiConnectionChange,
  setAiEventSink,
} from "@/lib/aiSocket";
import { sfx } from "@/lib/sfx";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  appendMessage,
  attachRequestId,
  clearThread,
  failIfPending,
  failPending,
  markSlowIfPending,
  resolveMessage,
  setBusy,
  setConnected,
  setLastPrompt,
  setMessageState,
} from "@/store/assistantSlice";
import { useCallback, useEffect } from "react";
import {
  MAX_PROMPT_LENGTH,
  type AiAccepted,
  type AiCompleted,
  type AiRejected,
  type AiRequestKind,
  type AiTimedOut,
  type WsException,
} from "./types";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";

/**
 * Local give-up deadline. Must stay ABOVE the server's own
 * `AI_REQUEST_TIMEOUT_MS` (120s in full-stack compose, 30s in the core-api-only
 * files) so we never abandon a request the backend is still working on.
 */
const LOCAL_TIMEOUT_MS = 180_000;

/**
 * Deadline for `ai.accepted` alone. Acceptance is a fast, local, pre-dispatch
 * step — if it hasn't landed in this long, the ask is not queued and no answer
 * is coming. Without this the thinking bubble spins forever, because the
 * 180s deadline above is only armed once acceptance arrives.
 */
const ACCEPT_TIMEOUT_MS = 20_000;

/** Key for the accept-deadline timer, which has no requestId to key on yet. */
const ACCEPT_TIMER = "accept";

const COPY = {
  disconnected: "Connection lost — please ask again.",
  failed: "The assistant could not answer. Please try again.",
  noAck: "Couldn't reach the assistant. Please ask again.",
  reconnecting: "Session expired — reconnecting. Please ask again.",
  serverError: "Something went wrong. Please try again.",
  slow: "Still thinking…",
  stopped: "Stopped.",
  quota: "The assistant has reached its usage limit for now. Please try again later.",
} as const;

/**
 * A `failed` summary is an opaque backend exception, but quota exhaustion is
 * worth telling apart: it is not transient within the minute and "please try
 * again" is misleading advice for it. Matched on the diagnostic — which is
 * still never rendered.
 */
function isQuotaExhausted(summary: string): boolean {
  return /429|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(summary ?? "");
}

/**
 * Protocol state is module-level, not per-component, because the socket and the
 * thread are both singletons — and because the AI screen unmounts on a tab
 * change while an answer is still outstanding. Holding it in a component would
 * drop the reply on the floor and strand `busy` at true.
 */
let inFlightPlaceholderId: string | null = null;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Requests the user explicitly stopped waiting for. The server has no cancel
 * event, so a late `ai.completed` for one of these still arrives — and must not
 * overwrite the "Stopped" bubble with an answer nobody is waiting for.
 */
const abandoned = new Set<string>();

let placeholderSeq = 0;
const nextId = () => `ai-${Date.now()}-${placeholderSeq++}`;

function clearTimer(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

function clearAllTimers() {
  timers.forEach((timer) => clearTimeout(timer));
  timers.clear();
}

interface SendOptions {
  /** Coach only. Scopes retrieval to one client's intake and check-ins. */
  membershipId?: string | null;
  /** Display name for that client — thread annotation only, never sent. */
  scopeName?: string | null;
  kind?: AiRequestKind;
}

/**
 * Owns the socket and every `ai.*` handler. Mount ONCE, at the root layout —
 * never in a screen. Mirrors `useChatEvents`.
 *
 * The invariant that makes everything else work: at most ONE un-acknowledged
 * ask in flight. `ai.rejected` and `exception` carry no `requestId`, so with
 * concurrent sends there is no way to know which ask a bare rejection refers
 * to. Serialising sends makes correlation exact rather than probable — and it
 * is also the only brake on the socket path, which has no rate limiting and
 * bills every accepted request against a low daily Gemini quota.
 */
export function useAiEvents() {
  const dispatch = useAppDispatch();
  const { tenantId } = useActiveTenant();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(
    () => onAiConnectionChange((c) => dispatch(setConnected(c))),
    [dispatch],
  );

  // Deliberately NOT gated on `tenantId`. The tenant lives in the JWT, and the
  // gateway is the authority on whether a token carries one — a coach whose
  // Redux tenantId hasn't resolved (it comes from `coachMe.currentTenant`,
  // which is not guaranteed to be present) would otherwise get no listeners at
  // all while `send` happily opened its own socket and emitted into a void.
  // Tenant-less clients are handled where it belongs: the tab is hidden, and
  // the server rejects the handshake.
  const active = isAuthenticated;

  // Reset protocol state when the SESSION changes — never on a socket
  // replacement, which `send` itself can trigger and which would orphan the
  // very ask it just made.
  useEffect(() => {
    inFlightPlaceholderId = null;
    clearAllTimers();
  }, [active, tenantId]);

  useEffect(() => {
    if (!active) {
      disconnectAiSocket();
      dispatch(setConnected(false));
      return;
    }

    const onAccepted = ({ requestId }: AiAccepted) => {
      clearTimer(ACCEPT_TIMER);
      inFlightPlaceholderId = null;

      // The thread finds its own pending bubble — see attachRequestId. The
      // module flag above is only a send-gate, never the correlation key.
      dispatch(attachRequestId({ requestId }));

      // The local deadline starts here, not at emit time: before acceptance
      // the request was never queued.
      timers.set(
        requestId,
        setTimeout(() => {
          timers.delete(requestId);
          // Guarded: an answer that lands just before this fires must not be
          // overwritten by the deadline that lost the race.
          dispatch(failIfPending({ id: requestId, text: COPY.failed }));
        }, LOCAL_TIMEOUT_MS),
      );
    };

    const onCompleted = (event: AiCompleted) => {
      clearTimer(event.requestId);

      if (abandoned.has(event.requestId)) {
        abandoned.delete(event.requestId);
        return; // user stopped waiting; leave the bubble as-is
      }

      if (event.status === "succeeded") {
        sfx.pop();
        // Deliberately unconditional: a late answer for a request we already
        // gave up on locally replaces the failure rather than being dropped.
        dispatch(
          resolveMessage({ requestId: event.requestId, text: event.summary }),
        );
      } else {
        // `summary` is a raw backend exception string on failure — the single
        // most likely way for internals to end up on screen. `warn`, not
        // `error`: a quota-exhausted backend is an expected server condition,
        // and a red box on every ask buries real client faults.
        console.warn("[ai] request failed:", event.summary);
        dispatch(
          setMessageState({
            id: event.requestId,
            state: "failed",
            // Classified from the diagnostic without ever rendering it: "try
            // again" is actively wrong advice when the daily quota is gone.
            text: isQuotaExhausted(event.summary) ? COPY.quota : COPY.failed,
          }),
        );
      }
      dispatch(setBusy(false));
    };

    // Advisory only: ai-service is still working and a late answer still lands.
    // Guarded in the reducer, because this fires on the server's own timer and
    // routinely lands AFTER the answer did — unguarded it re-opened a finished
    // bubble as "Still thinking…" with no Stop button to escape it.
    const onTimedOut = ({ requestId }: AiTimedOut) => {
      dispatch(markSlowIfPending({ requestId, text: COPY.slow }));
    };

    const failInFlight = (text: string) => {
      clearTimer(ACCEPT_TIMER);
      const placeholderId = inFlightPlaceholderId;
      inFlightPlaceholderId = null;
      if (placeholderId) {
        clearTimer(placeholderId);
        dispatch(setMessageState({ id: placeholderId, state: "failed", text }));
      }
      dispatch(setBusy(false));
    };

    // The gateway re-verifies the token on EVERY message and closes the
    // socket right after this. Without an explicit handler the pending ask
    // would sit on a spinner until the disconnect handler happened to fire.
    const onUnauthorized = () => failInFlight(COPY.reconnecting);

    // Validation error. The socket stays open and usable.
    const onRejected = ({ message }: AiRejected) => failInFlight(message);

    const onException = (event: WsException) => {
      console.error("[ai] gateway exception:", event?.message);
      failInFlight(COPY.serverError);
    };

    // Rooms do not survive a reconnect: a new connection is a new socket id
    // and an empty set of rooms, so every outstanding answer is permanently
    // gone. There is no endpoint to fetch it from.
    const onDisconnect = () => {
      inFlightPlaceholderId = null;
      clearAllTimers();
      dispatch(failPending(COPY.disconnected));
    };

    // Synchronous and socket-instance-independent: the socket forwards to
    // whatever sink is registered, so there is no window in which frames
    // arrive unhandled and no re-binding to do when the socket is replaced.
    const release = setAiEventSink({
      onAccepted,
      onCompleted,
      onTimedOut,
      onRejected,
      onUnauthorized,
      onException,
      onDisconnect,
    });

    void connectAiSocket();

    return release;
  }, [dispatch, active]);
}

/**
 * Screen-facing view of the assistant. Reads thread state and sends prompts;
 * all event handling belongs to `useAiEvents` at the root.
 */
export function useAiChat() {
  const dispatch = useAppDispatch();
  const {
    thread,
    busy: protocolBusy,
    connected,
    lastPrompt,
  } = useAppSelector((s) => s.assistant);

  /**
   * A spinner on screen with no Stop button is a trap, and `busy` alone can't
   * prevent one: it tracks the PROTOCOL (cleared the moment `ai.completed`
   * lands) while the spinner is driven by the BUBBLE's state, and any late
   * event that reopens a bubble makes the two disagree. Taking the union means
   * anything still visibly thinking is always stoppable — and, symmetrically,
   * that a second ask can't be sent behind a bubble that never resolved.
   */
  const hasPending = thread.some(
    (m) =>
      m.role === "assistant" && (m.state === "thinking" || m.state === "slow"),
  );
  const busy = protocolBusy || hasPending;

  const send = useCallback(
    async (raw: string, options: SendOptions = {}) => {
      const prompt = raw.trim();
      // Validated locally so a bad prompt never costs a round trip.
      if (!prompt || prompt.length > MAX_PROMPT_LENGTH) return;
      // `busy` is a render-cycle behind a double tap; the module flag is not.
      if (busy || inFlightPlaceholderId) return;

      const placeholderId = nextId();
      dispatch(setLastPrompt(prompt));
      dispatch(
        appendMessage({
          id: `${placeholderId}-u`,
          role: "user",
          text: prompt,
          ...(options.scopeName ? { scopeName: options.scopeName } : {}),
        }),
      );
      dispatch(
        appendMessage({
          id: placeholderId,
          role: "assistant",
          text: "",
          state: "thinking",
        }),
      );
      dispatch(setBusy(true));
      inFlightPlaceholderId = placeholderId;

      const fail = (text: string) => {
        clearTimer(ACCEPT_TIMER);
        inFlightPlaceholderId = null;
        dispatch(setMessageState({ id: placeholderId, state: "failed", text }));
        dispatch(setBusy(false));
      };

      const socket = await connectAiSocket();
      if (!socket) {
        fail(COPY.disconnected);
        return;
      }

      const sent = await emitAiRequest({
        kind: options.kind ?? "advice",
        prompt,
        // Omit rather than send null — a client's socket ignores this field
        // entirely, and an empty value on the coach path would be malformed.
        ...(options.membershipId ? { membershipId: options.membershipId } : {}),
      });

      if (!sent) {
        fail(COPY.disconnected);
        return;
      }

      // Armed here, not in the `ai.accepted` handler: if acceptance never
      // arrives — no listener bound, a dropped event, a silent gateway — this
      // is the only thing standing between the user and a spinner that never
      // resolves.
      clearTimer(ACCEPT_TIMER);
      timers.set(
        ACCEPT_TIMER,
        setTimeout(() => {
          timers.delete(ACCEPT_TIMER);
          if (inFlightPlaceholderId === placeholderId) inFlightPlaceholderId = null;
          // Guarded in the reducer: a no-op if the bubble already resolved, so
          // the module flag is no longer load-bearing here either.
          dispatch(failIfPending({ id: placeholderId, text: COPY.noAck }));
        }, ACCEPT_TIMEOUT_MS),
      );
    },
    [busy, dispatch],
  );

  /**
   * Stop waiting for the current answer. Local only — the gateway has no cancel
   * event, so ai-service keeps working and the Gemini call is still billed. All
   * this does is give the user back their composer and stop the spinner.
   */
  const stop = useCallback(() => {
    // Every pending bubble, not just the first: one ask at a time SHOULD make
    // these equivalent, but a Stop that leaves a spinner behind is precisely
    // the dead end this needs to be incapable of producing.
    const pending = thread.filter(
      (m) =>
        m.role === "assistant" &&
        (m.state === "thinking" || m.state === "slow"),
    );

    clearAllTimers();
    inFlightPlaceholderId = null;
    for (const msg of pending) {
      // Remember the id so a late `ai.completed` doesn't resurrect the answer.
      if (msg.requestId) abandoned.add(msg.requestId);
      dispatch(
        setMessageState({ id: msg.id, state: "stopped", text: COPY.stopped }),
      );
    }
    dispatch(setBusy(false));
  }, [thread, dispatch]);

  const reset = useCallback(() => {
    inFlightPlaceholderId = null;
    abandoned.clear();
    clearAllTimers();
    dispatch(clearThread());
  }, [dispatch]);

  return { thread, busy, connected, lastPrompt, send, stop, reset };
}

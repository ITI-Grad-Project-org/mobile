import type { AiMessage, AiMessageState } from "@/features/shared/assistant/types";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { clearActiveTenant, setActiveTenant } from "./activeTenantSlice";

/**
 * The assistant thread is in-memory only, and deliberately so: the gateway
 * persists nothing, so there is no history to reconcile against. Living in
 * Redux (rather than screen state) means the thread survives a tab change and
 * that the tenant-isolation reset is one reducer instead of per-screen cleanup.
 *
 * Never persist this. An answer grounded in Coach A's knowledge base must not
 * be reachable after switching to Coach B.
 */
interface AssistantState {
  thread: AiMessage[];
  /** One un-acknowledged ask at a time — this is what gates the send button. */
  busy: boolean;
  connected: boolean;
  /** Kept so a failed send can be re-populated into the composer in one tap. */
  lastPrompt: string | null;
}

const initialState: AssistantState = {
  thread: [],
  busy: false,
  connected: false,
  lastPrompt: null,
};

const assistantSlice = createSlice({
  name: "assistant",
  initialState,
  reducers: {
    appendMessage: (state, action: PayloadAction<AiMessage>) => {
      state.thread.push(action.payload);
    },

    /**
     * Attach the server's id to the pending bubble after `ai.accepted`.
     *
     * Correlates off the THREAD, not off a caller-supplied placeholder id: only
     * one ask is ever in flight, so the newest pending assistant bubble without
     * an id is unambiguously the one being accepted. Keying this on module
     * state instead meant any effect that reset that state orphaned the answer
     * — the bubble kept thinking while the reply arrived and was discarded.
     */
    attachRequestId: (state, action: PayloadAction<{ requestId: string }>) => {
      for (let i = state.thread.length - 1; i >= 0; i--) {
        const msg = state.thread[i];
        if (
          msg.role === "assistant" &&
          !msg.requestId &&
          (msg.state === "thinking" || msg.state === "slow")
        ) {
          msg.requestId = action.payload.requestId;
          return;
        }
      }
    },

    /**
     * Fail a bubble only if it is still waiting. Guards the local deadlines
     * against firing after the answer already landed.
     */
    failIfPending: (state, action: PayloadAction<{ id: string; text: string }>) => {
      // Matches either key: the accept deadline knows only the placeholder id,
      // the answer deadline only the requestId.
      const msg = state.thread.find(
        (m) => m.id === action.payload.id || m.requestId === action.payload.id
      );
      if (!msg || !msg.state || msg.state === "failed" || msg.state === "stopped") return;
      msg.state = "failed";
      msg.text = action.payload.text;
      state.busy = false;
    },

    /**
     * Apply the `ai.timed_out` advisory — but ONLY to a bubble that is still
     * waiting.
     *
     * The advisory is fire-and-forget on the server's own timer, so it can (and
     * does) arrive AFTER `ai.completed` already answered or failed the request.
     * Applied unconditionally it overwrote a finished bubble's text with
     * "Still thinking…" and put it back on the spinner — and because
     * `ai.completed` had already cleared `busy`, the composer was showing Send
     * rather than Stop, leaving no way out of a wait that was already over.
     */
    markSlowIfPending: (
      state,
      action: PayloadAction<{ requestId: string; text: string }>
    ) => {
      const msg = state.thread.find((m) => m.requestId === action.payload.requestId);
      if (!msg || msg.state !== "thinking") return;
      msg.state = "slow";
      msg.text = action.payload.text;
    },

    resolveMessage: (
      state,
      action: PayloadAction<{ requestId: string; text: string }>
    ) => {
      const msg = state.thread.find((m) => m.requestId === action.payload.requestId);
      if (!msg) {
        // Either a late answer for an ask we gave up on, or — the bug worth
        // catching — an answer whose placeholder never got its requestId, which
        // leaves a bubble thinking forever.
        console.warn("[ai] no bubble for requestId", action.payload.requestId);
        return;
      }
      msg.text = action.payload.text;
      msg.state = undefined;
    },

    setMessageState: (
      state,
      action: PayloadAction<{ id: string; state: AiMessageState; text?: string }>
    ) => {
      const msg = state.thread.find(
        (m) => m.id === action.payload.id || m.requestId === action.payload.id
      );
      if (!msg) return;
      msg.state = action.payload.state;
      if (action.payload.text !== undefined) msg.text = action.payload.text;
    },

    /**
     * Turn every still-pending assistant bubble into a terminal failure. Used
     * on disconnect: rooms do not survive a reconnect, so nothing outstanding
     * can ever be answered.
     */
    failPending: (state, action: PayloadAction<string>) => {
      for (const msg of state.thread) {
        // Terminal states are left alone: a bubble the user already stopped
        // must not be relabelled "Connection lost" by a later disconnect.
        if (
          msg.role === "assistant" &&
          msg.state &&
          msg.state !== "failed" &&
          msg.state !== "stopped"
        ) {
          msg.state = "failed";
          msg.text = action.payload;
        }
      }
      state.busy = false;
    },

    setBusy: (state, action: PayloadAction<boolean>) => {
      state.busy = action.payload;
    },

    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
    },

    setLastPrompt: (state, action: PayloadAction<string | null>) => {
      state.lastPrompt = action.payload;
    },

    clearThread: (state) => {
      state.thread = [];
      state.busy = false;
      state.lastPrompt = null;
    },
  },
  extraReducers: (builder) => {
    // Tenant isolation: an answer from the previous tenant's knowledge base
    // must never be on screen under the new one.
    builder
      .addCase(setActiveTenant, () => initialState)
      .addCase(clearActiveTenant, () => initialState);
  },
});

export const {
  appendMessage,
  attachRequestId,
  failIfPending,
  markSlowIfPending,
  resolveMessage,
  setMessageState,
  failPending,
  setBusy,
  setConnected,
  setLastPrompt,
  clearThread,
} = assistantSlice.actions;

export default assistantSlice.reducer;

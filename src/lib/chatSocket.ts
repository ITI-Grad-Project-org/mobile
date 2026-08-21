import { BASE_URL } from "@/api/config";
import { refreshAccessToken } from "@/api/tokenRefresh";
import type { SocketAck } from "@/features/shared/messaging/types";
import { describeSocketError } from "@/lib/socketError";
import * as SecureStore from "expo-secure-store";
import { io, type Socket } from "socket.io-client";

/**
 * The `/chat` gateway does NOT reject at the handshake the way the AI gateway
 * on the default namespace does. It accepts the connection, then — if the token
 * is missing, expired or unreadable — emits `error` `{ message: 'Unauthorized' }`
 * and closes the socket server-side. Two consequences drive most of this file:
 *
 * 1. `connect` fires on a REJECTED attempt too, so it is not proof of anything
 *    and must not reset the retry budget (see AUTH_SETTLE_MS).
 * 2. the close arrives as `disconnect('io server disconnect')`, which socket.io
 *    deliberately never retries — recovery here is the only way back.
 */
const NAMESPACE = "/chat";

/** A dead socket never fires its ack, so emits need their own deadline. */
const ACK_TIMEOUT_MS = 8000;
const MAX_AUTH_RETRIES = 3;
/** A connection still up after this long was accepted, not about to be kicked. */
const AUTH_SETTLE_MS = 4000;
/** How long to stay down after the retry budget is spent, before starting over. */
const AUTH_COOLDOWN_MS = 60_000;

let socket: Socket | null = null;
let connecting: Promise<Socket | null> | null = null;
/** Auth failures are not retried by socket.io itself — we rotate the token. */
let authRetries = 0;
let recoveringAuth = false;
/** Set while the budget is spent: connect() no-ops until this timer fires. */
let authCooldown: ReturnType<typeof setTimeout> | null = null;
let generation = 0;

type ConnectionListener = (connected: boolean) => void;
type SocketListener = (socket: Socket | null) => void;

const connectionListeners = new Set<ConnectionListener>();
const socketListeners = new Set<SocketListener>();

function emitConnectionChange(connected: boolean) {
  connectionListeners.forEach((fn) => fn(connected));
}

function emitSocketChange() {
  socketListeners.forEach((fn) => fn(socket));
}

/** Subscribe to connect/disconnect. Returns an unsubscribe. */
export function onChatConnectionChange(fn: ConnectionListener): () => void {
  connectionListeners.add(fn);
  return () => {
    connectionListeners.delete(fn);
  };
}

/** Subscribe to the singleton being created or torn down. */
export function onChatSocketChange(fn: SocketListener): () => void {
  socketListeners.add(fn);
  return () => {
    socketListeners.delete(fn);
  };
}

export function getChatSocket(): Socket | null {
  return socket;
}

export function isChatConnected(): boolean {
  return socket?.connected ?? false;
}

export async function connectChatSocket(): Promise<Socket | null> {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  // Budget spent — the cooldown timer owns the next attempt. Without this the
  // give-up itself would start the next one: tearing the socket down notifies
  // `useChatEvents`, which re-runs and calls straight back in here.
  if (authCooldown) return null;
  if (connecting) return connecting;

  const gen = generation;

  connecting = (async () => {
    const token = await SecureStore.getItemAsync("accessToken");
    if (!token) return null;
    // Torn down (logout / tenant switch) while we were reading the token.
    if (gen !== generation) return null;

    const s = io(`${BASE_URL}${NAMESPACE}`, {
      auth: (cb: (data: { token: string }) => void) => {
        SecureStore.getItemAsync("accessToken")
          .then((fresh) => cb({ token: fresh ?? token }))
          .catch(() => cb({ token }));
      },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    s.on("connect", () => {
      emitConnectionChange(true);
      // NOT proof of success: the gateway authorises after the connection is
      // up, so a rejected attempt lands here too. Clearing the budget on
      // `connect` made MAX_AUTH_RETRIES unreachable and looped a bad token for
      // as long as the app was open. Only a connection that SURVIVES counts.
      setTimeout(() => {
        if (s.connected) authRetries = 0;
      }, AUTH_SETTLE_MS);
    });
    s.on("disconnect", (reason: string) => {
      emitConnectionChange(false);
      if (__DEV__) console.warn("[chat] disconnected:", reason);
      // socket.io never retries a close the SERVER initiated — and that is
      // exactly how `/chat` rejects a token. Left alone, chat goes silently
      // dead for the rest of the session while REST keeps working.
      if (reason === "io server disconnect") void handleAuthFailure();
    });

    s.on("error", (err: unknown) => {
      if (__DEV__) console.warn("[chat] error:", describeSocketError(err));
      if (isAuthError(err)) void handleAuthFailure();
    });
    // Logged in dev before the auth check, like the AI socket. A transport
    // failure ("websocket error") is not an auth error, so it matched nothing
    // here and was swallowed: chat looked healthy while it was silently down,
    // and only the AI socket's warning hinted that anything was wrong.
    s.on("connect_error", (err: unknown) => {
      if (__DEV__)
        console.warn("[chat] connect_error:", describeSocketError(err));
      if (isAuthError(err)) void handleAuthFailure();
    });

    if (gen !== generation) {
      // Superseded during construction — drop this one, keep the newer path.
      s.removeAllListeners();
      s.disconnect();
      return null;
    }

    socket = s;
    emitSocketChange();
    return s;
  })().finally(() => {
    connecting = null;
  });

  return connecting;
}

function isAuthError(err: unknown): boolean {
  const raw =
    typeof err === "string"
      ? err
      : ((err as { message?: string; data?: { message?: string } })?.message ??
        (err as { data?: { message?: string } })?.data?.message ??
        "");
  return /unauthor|forbidden|token|jwt|auth|401|403/i.test(String(raw));
}

async function handleAuthFailure() {
  // `error`, `connect_error` and `disconnect` can all fire for one rejection.
  if (recoveringAuth) return;

  if (authRetries >= MAX_AUTH_RETRIES) {
    startAuthCooldown();
    return;
  }
  recoveringAuth = true;
  authRetries += 1;
  const attempt = authRetries;
  const delay = 1000 * 2 ** (attempt - 1);
  try {
    await new Promise((r) => setTimeout(r, delay));

    // First attempt reconnects on whatever SecureStore holds now: a server
    // restart needs no new token, and baseQueryWithReauth may already have
    // rotated one in. From the second attempt on, the token really is the
    // problem — it is the one the gateway just refused, and replaying it only
    // burns the budget. REST recovers from that off a 401; the socket has no
    // 401 to hang a refresh off, so it has to ask for one itself. (This is why
    // chat stayed dead after a cold start on an expired token while every
    // screen's data loaded fine.)
    if (attempt > 1) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        // No usable refresh token. Stay down — REST's next 401 owns the logout.
        startAuthCooldown();
        return;
      }
    }
    // The handshake `auth` callback re-reads SecureStore, which now holds the
    // rotated token.
    await reconnectChatSocket({ keepAuthState: true });
  } finally {
    recoveringAuth = false;
  }
}

/** Stay down for a while, then start the whole budget over. */
function startAuthCooldown() {
  disconnectChatSocket({ keepAuthState: true });
  authRetries = 0;
  if (authCooldown) return;
  authCooldown = setTimeout(() => {
    authCooldown = null;
    void connectChatSocket();
  }, AUTH_COOLDOWN_MS);
}

/**
 * `keepAuthState` marks a teardown that is PART of auth recovery, so the retry
 * budget and cooldown survive it. Every other caller (logout, tenant switch) is
 * a fresh start and clears both — otherwise a re-login would sit out the
 * remainder of the previous session's cooldown.
 */
export function disconnectChatSocket({ keepAuthState = false } = {}) {
  generation += 1;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    emitConnectionChange(false);
    emitSocketChange();
  }
  if (!keepAuthState) {
    authRetries = 0;
    if (authCooldown) {
      clearTimeout(authCooldown);
      authCooldown = null;
    }
  }
}

export async function reconnectChatSocket(
  opts: { keepAuthState?: boolean } = {}
): Promise<Socket | null> {
  disconnectChatSocket(opts);
  return connectChatSocket();
}

export function emitAck<T = unknown>(
  event: string,
  payload: unknown
): Promise<SocketAck<T>> {
  return new Promise((resolve, reject) => {
    const s = socket;
    if (!s?.connected) {
      reject(new Error("chat socket not connected"));
      return;
    }

    let settled = false;
    const finish = () => {
      settled = true;
      clearTimeout(timer);
      s.off("disconnect", onDown);
    };
    // Losing the connection mid-flight is a failure now, not in 8s — the caller
    // is waiting to fall back to REST.
    const onDown = () => {
      if (settled) return;
      finish();
      reject(new Error(`chat socket dropped during ${event}`));
    };
    const timer = setTimeout(() => {
      if (settled) return;
      finish();
      reject(new Error(`ack timeout for ${event}`));
    }, ACK_TIMEOUT_MS);

    s.on("disconnect", onDown);
    s.emit(event, payload, (ack: SocketAck<T>) => {
      if (settled) return;
      finish();
      // A server that forgets the ack shape shouldn't crash the caller.
      resolve(ack ?? { ok: false, error: "empty acknowledgement" });
    });
  });
}

/** Fire-and-forget emit (typing indicators) — no ack, never throws. */
export function emitFireAndForget(event: string, payload: unknown) {
  if (socket?.connected) socket.emit(event, payload);
}

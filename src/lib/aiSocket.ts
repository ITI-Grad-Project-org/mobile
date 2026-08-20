import { BASE_URL } from "@/api/config";
import { refreshAccessToken } from "@/api/tokenRefresh";
import type {
  AiAccepted,
  AiCompleted,
  AiRejected,
  AiRequestPayload,
  AiTimedOut,
  WsException,
} from "@/features/shared/assistant/types";
import * as SecureStore from "expo-secure-store";
import { io, type Socket } from "socket.io-client";

/**
 * Where `ai.*` frames are delivered. Registered by `useAiEvents`.
 *
 * The socket binds its listeners ONCE, synchronously, at creation — they
 * forward here. Consumers swap the sink instead of attaching their own
 * handlers, because attaching from a React effect meant racing the socket's
 * own creation (which bumps the effect's dependency and cancels it): the
 * frames arrived, nothing was listening, and the UI sat on a spinner.
 */
export interface AiEventSink {
  onAccepted(event: AiAccepted): void;
  onCompleted(event: AiCompleted): void;
  onTimedOut(event: AiTimedOut): void;
  onRejected(event: AiRejected): void;
  onUnauthorized(): void;
  onException(event: WsException): void;
  onDisconnect(): void;
}

let sink: Partial<AiEventSink> = {};

/** Register the sink. Returns an unsubscribe that restores the empty sink. */
export function setAiEventSink(next: Partial<AiEventSink>): () => void {
  sink = next;
  return () => {
    if (sink === next) sink = {};
  };
}

/**
 * The AI assistant lives on the DEFAULT namespace. `/chat` is the human
 * messaging gateway (see lib/chatSocket.ts) — different events, different
 * rooms, nothing crosses over. Emitting `ai.requested` at `/chat` does not
 * error, it just never answers, so the two modules stay strictly separate.
 */
const MAX_AUTH_RETRIES = 3;

let socket: Socket | null = null;
let connecting: Promise<Socket | null> | null = null;
/** The gateway re-verifies the token on every message, so 401s recur. */
let authRetries = 0;
let recoveringAuth = false;
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
export function onAiConnectionChange(fn: ConnectionListener): () => void {
  connectionListeners.add(fn);
  return () => {
    connectionListeners.delete(fn);
  };
}

/**
 * Subscribe to the singleton being created or torn down. Consumers attach
 * their `ai.*` handlers to a specific Socket instance, so they must re-attach
 * when a logout or tenant switch replaces it.
 */
export function onAiSocketChange(fn: SocketListener): () => void {
  socketListeners.add(fn);
  return () => {
    socketListeners.delete(fn);
  };
}

export function getAiSocket(): Socket | null {
  return socket;
}

export function isAiConnected(): boolean {
  return socket?.connected ?? false;
}

export async function connectAiSocket(): Promise<Socket | null> {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  if (connecting) return connecting;

  const gen = generation;

  connecting = (async () => {
    const token = await SecureStore.getItemAsync("accessToken");
    if (!token) return null;
    // Torn down (logout / tenant switch) while we were reading the token.
    if (gen !== generation) return null;

    const s = io(BASE_URL, {
      // Callback form, not a static object: socket.io re-invokes it on every
      // reconnect, so a token refreshed since connect time is picked up.
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
      authRetries = 0;
      recoveringAuth = false;
      if (__DEV__) console.log("[ai] connected", s.id);
      emitConnectionChange(true);
    });
    s.on("disconnect", (reason) => {
      if (__DEV__) console.log("[ai] disconnected:", reason);
      emitConnectionChange(false);
      sink.onDisconnect?.();
    });

    // Bound here, synchronously, for the lifetime of the socket — never from a
    // React effect. See AiEventSink above.
    s.on("ai.accepted", (e: AiAccepted) => sink.onAccepted?.(e));
    s.on("ai.completed", (e: AiCompleted) => sink.onCompleted?.(e));
    s.on("ai.timed_out", (e: AiTimedOut) => sink.onTimedOut?.(e));
    s.on("ai.rejected", (e: AiRejected) => sink.onRejected?.(e));
    s.on("exception", (e: WsException) => sink.onException?.(e));

    // The gateway closes the socket right after this, so a refresh + explicit
    // reconnect is the only way back.
    s.on("ai.unauthorized", () => {
      sink.onUnauthorized?.();
      void handleAuthFailure();
    });
    s.on("connect_error", (err) => {
      if (__DEV__) console.warn("[ai] connect_error:", err?.message);
      emitConnectionChange(false);
    });

    // Every inbound frame, so a silent failure is diagnosable from Metro rather
    // than by guesswork.
    if (__DEV__) {
      s.onAny((event, ...args) =>
        console.log("[ai] ←", event, JSON.stringify(args).slice(0, 400))
      );
    }

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

async function handleAuthFailure() {
  if (recoveringAuth) return;

  if (authRetries >= MAX_AUTH_RETRIES) {
    // Give up quietly — REST still works and will drive a real logout on 401.
    disconnectAiSocket();
    return;
  }
  recoveringAuth = true;
  authRetries += 1;

  try {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      disconnectAiSocket();
      return;
    }
    // The auth callback re-reads SecureStore, which now holds the new token.
    socket?.connect();
  } finally {
    recoveringAuth = false;
  }
}

export function disconnectAiSocket({ keepAuthRetries = false } = {}) {
  generation += 1;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    emitConnectionChange(false);
    emitSocketChange();
  }
  if (!keepAuthRetries) authRetries = 0;
}

export async function reconnectAiSocket(
  opts: { keepAuthRetries?: boolean } = {}
): Promise<Socket | null> {
  disconnectAiSocket(opts);
  return connectAiSocket();
}

/** The handshake measures ~2s against the live gateway; allow generous slack. */
const CONNECT_WAIT_MS = 15000;

/** Resolve once the socket is actually connected, or false on timeout. */
function waitForConnection(s: Socket): Promise<boolean> {
  if (s.connected) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      s.off("connect", onUp);
      s.off("connect_error", onFail);
      resolve(ok);
    };
    const onUp = () => finish(true);
    const onFail = () => finish(false);
    const timer = setTimeout(() => finish(false), CONNECT_WAIT_MS);
    s.on("connect", onUp);
    s.on("connect_error", onFail);
  });
}

/**
 * Fire-and-forget. There is deliberately no ack variant: the gateway never
 * invokes an acknowledgement callback — the reply arrives as a separate
 * `ai.accepted` / `ai.completed` event, seconds later.
 *
 * Awaits the handshake rather than failing on a socket that simply hasn't
 * finished connecting — otherwise the first ask after any teardown reports
 * "connection lost" for what is really just startup latency.
 */
export async function emitAiRequest(payload: AiRequestPayload): Promise<boolean> {
  const s = socket;
  if (!s) return false;
  const ready = await waitForConnection(s);
  // The singleton can be replaced while we wait (logout, tenant switch).
  if (!ready || socket !== s || !s.connected) return false;
  if (__DEV__) console.log("[ai] → ai.requested", payload);
  s.emit("ai.requested", payload);
  return true;
}

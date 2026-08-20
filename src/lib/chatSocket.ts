import { BASE_URL } from "@/api/config";
import type { SocketAck } from "@/features/shared/messaging/types";
import * as SecureStore from "expo-secure-store";
import { io, type Socket } from "socket.io-client";

const NAMESPACE = "/chat";

/** A dead socket never fires its ack, so emits need their own deadline. */
const ACK_TIMEOUT_MS = 8000;
const MAX_AUTH_RETRIES = 3;

let socket: Socket | null = null;
let connecting: Promise<Socket | null> | null = null;
/** Auth failures are not retried by socket.io itself — we re-read the token. */
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
      authRetries = 0;
      recoveringAuth = false;
      emitConnectionChange(true);
    });
    s.on("disconnect", () => emitConnectionChange(false));

    s.on("error", (err: unknown) => {
      if (isAuthError(err)) void handleAuthFailure();
    });
    s.on("connect_error", (err: unknown) => {
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
  // `error` and `connect_error` can both fire for one rejection.
  if (recoveringAuth) return;

  if (authRetries >= MAX_AUTH_RETRIES) {
    // Give up quietly — REST still works and will drive a real logout on 401.
    disconnectChatSocket();
    return;
  }
  recoveringAuth = true;
  authRetries += 1;
  const attempt = authRetries;
  const delay = 1000 * 2 ** (attempt - 1);
  await new Promise((r) => setTimeout(r, delay));
  try {
    // baseQueryWithReauth may have written a fresh token while we waited.
    await reconnectChatSocket({ keepAuthRetries: true });
  } finally {
    recoveringAuth = false;
  }
}

export function disconnectChatSocket({ keepAuthRetries = false } = {}) {
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

export async function reconnectChatSocket(
  opts: { keepAuthRetries?: boolean } = {}
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

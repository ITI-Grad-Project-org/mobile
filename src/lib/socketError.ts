/**
 * engine.io reports every transport failure as the same opaque string —
 * `"websocket error"` — because that literal is hardcoded in its WebSocket
 * transport (`ws.onerror = (e) => this.onError("websocket error", e)`). The
 * real cause (connection refused, TLS failure, DNS, a proxy that rejected the
 * upgrade) only ever reaches us on `description`, which carries the raw
 * platform error event and which socket.io leaves off its `Error` type.
 *
 * Without it a dev-build socket failure is undiagnosable: the message is
 * identical whether the host is unreachable, the certificate is untrusted, or
 * an ingress refused the HTTP upgrade. Note that `description` is absent for a
 * server-side rejection (a gateway guard, a bad token) — those arrive with the
 * middleware's own message, which is why that case reads cleanly here.
 */
export function describeSocketError(err: unknown): string {
  const { message, description } = (err ?? {}) as {
    message?: string;
    description?: unknown;
  };
  const detail = detailOf(description);
  return detail
    ? `${message ?? "error"} (${detail})`
    : (message ?? "unknown error");
}

function detailOf(description: unknown): string {
  if (!description) return "";
  if (typeof description === "string") return description;

  // React Native hands `onerror` an event whose `message` names the failure;
  // Node/ws hands over an Error. Both land on `.message`.
  const { message } = description as { message?: unknown };
  if (typeof message === "string" && message) return message;

  try {
    const json = JSON.stringify(description);
    // A bare "{}" is an event with nothing enumerable — noise, not detail.
    return json && json !== "{}" ? json.slice(0, 200) : "";
  } catch {
    return "";
  }
}

/**
 * Billing errors, mapped to coach-facing copy. Same shape as
 * `messageForError` in InviteClientSheet — the app has no shared toast, so each
 * call site owns its own mapper.
 *
 * The API's error body is `{ statusCode, message, errors?, timestamp, path }`;
 * `errors` only appears on validation failures.
 */
export function messageForBillingError(err: any): string {
  const status = err?.status ?? err?.originalStatus;
  const serverMsg = err?.data?.message;
  const flat = Array.isArray(serverMsg) ? serverMsg.join(" ") : serverMsg;
  const validation: string[] | undefined = err?.data?.errors;

  if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") {
    // The request may or may not have reached the backend. Say nothing about
    // the subscription — we genuinely do not know.
    return "Network error — check your connection and try again.";
  }
  if (status === 400) {
    if (validation?.length) return validation.join(", ");
    return typeof flat === "string" && flat ? flat : "That plan can't be purchased.";
  }
  if (status === 409) {
    // Only one transition 409s: active Studio -> Solo.
    return typeof flat === "string" && flat
      ? flat
      : "Your Studio plan is already active.";
  }
  if (status === 502) {
    // Paymob rejected the Intention. The attempt is marked failed server-side
    // and no subscription changed; retrying creates a fresh attempt.
    return "Our payment provider couldn't start the checkout. Please try again.";
  }
  if (status === 404) {
    return "We couldn't find that payment.";
  }
  if (typeof flat === "string" && flat) return flat;
  return "Something went wrong. Please try again.";
}

/**
 * True when a 403 is the active-client limit rather than an RBAC denial.
 *
 * Deliberately NOT decided by string-matching the server message: the
 * authoritative signal is a fresh GET /billing/me reporting
 * `canAddActiveClient: false`. Call sites refetch the summary and pass the
 * result in. This helper only narrows to "worth asking about" so a genuine
 * permission 403 keeps its own copy.
 */
export function isForbidden(err: any): boolean {
  return (err?.status ?? err?.originalStatus) === 403;
}

/** The server's own limit copy is already coach-friendly ("Your Free plan
 *  allows 3 active clients. Upgrade your subscription to add another client."),
 *  so prefer it verbatim over anything we'd write. */
export function serverMessage(err: any): string | null {
  const msg = err?.data?.message;
  const flat = Array.isArray(msg) ? msg.join(" ") : msg;
  return typeof flat === "string" && flat ? flat : null;
}

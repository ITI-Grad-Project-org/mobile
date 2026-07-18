import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

type AuthAction = "signup" | "login";

export function getAuthErrorMessage(
  error: unknown,
  action: AuthAction
): string {
  const e = error as (FetchBaseQueryError & { data?: any }) | undefined;
  const status = e?.status;

  // No response reached the server (offline, DNS, TLS, server down).
  if (status === "FETCH_ERROR") {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (status === "TIMEOUT_ERROR") {
    return "The request timed out. Please try again.";
  }
  if (status === "PARSING_ERROR") {
    return "Something went wrong on our side. Please try again.";
  }

  // A message the backend explicitly sent (string or string[]).
  const raw = e?.data?.message;
  const backendMessage = Array.isArray(raw) ? raw[0] : raw;

  // Normalize by message content first, so the coach and customer endpoints —
  // which don't always use the same status for the same problem — surface the
  // exact same wording to the user.
  const text = (backendMessage || "").toLowerCase();
  if (
    text.includes("already exist") ||
    text.includes("already registered") ||
    text.includes("already in use") ||
    text.includes("duplicate")
  ) {
    return "An account with this email already exists. Try signing in.";
  }
  if (
    text.includes("invalid credentials") ||
    text.includes("incorrect password") ||
    text.includes("wrong password") ||
    (text.includes("password") && text.includes("incorrect"))
  ) {
    return "Incorrect email or password.";
  }
  if (text.includes("not found") && action === "login") {
    return "No account found with that email.";
  }

  switch (status) {
    case 400:
    case 422:
      // Validation error — the backend's own text is usually the clearest.
      return backendMessage || "Please check the details you entered.";
    case 401:
      return "Incorrect email or password.";
    case 403:
      return "This account isn't allowed to sign in here.";
    case 404:
      return action === "login"
        ? "No account found with that email."
        : backendMessage || "Something went wrong. Please try again.";
    case 409:
      return "An account with this email already exists. Try signing in.";
    case 429:
      return "Too many attempts. Please wait a moment and try again.";
    default:
      break;
  }

  if (typeof status === "number" && status >= 500) {
    return "The server ran into a problem. Please try again shortly.";
  }

  return (
    backendMessage ||
    (action === "signup"
      ? "Couldn't create your account. Please try again."
      : "Couldn't sign you in. Please try again.")
  );
}

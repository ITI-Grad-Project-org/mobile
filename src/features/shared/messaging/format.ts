/** Timestamp formatting shared by the inbox list and both thread screens. */

import type { ConversationSummary } from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Bubble timestamp — 24h clock, matching the rest of the app. */
export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Inbox row timestamp: time today, "Yesterday", weekday, then a short date. */
export function formatThreadTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY);

  if (days === 0) return formatMessageTime(iso);
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Display name for a thread's client — never blank, so rows never collapse. */
export function clientName(c: ConversationSummary): string {
  const full = [c.client?.firstName, c.client?.lastName].filter(Boolean).join(" ").trim();
  return full || "Client";
}

/** Separator between days in a thread. */
export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** True when `a` falls on a different calendar day than `b`. */
export function isNewDay(a: string, b: string | undefined): boolean {
  if (!b) return true;
  return startOfDay(new Date(a)) !== startOfDay(new Date(b));
}

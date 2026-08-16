/**
 * The activity feed, made safe to render.
 *
 * /analytics/activity has no response schema in Swagger — core-api documents
 * the params and defers the body to analytics-service — so the field names in
 * `AnalyticsActivityRow` are transcribed from prose and at least one of them is
 * wrong in practice. Two failure modes follow from that, and both showed up:
 *
 *  - a field that turns out to be an OBJECT (a details bag rather than a
 *    pre-formatted string) crashes the row, because React can't render an
 *    object as a child;
 *  - a field that simply isn't there renders an empty line, so every row looks
 *    identical.
 *
 * Everything below therefore reads several plausible spellings, coerces to a
 * string, and never hands an object to <Text>. When the shape is finally
 * confirmed this can collapse back to plain field access — see the dev log in
 * `describeActivityShape`.
 */

import { formatShortDate } from "./format";

export interface ActivityRowView {
  id: string;
  membershipId?: string;
  clientName: string;
  /** Drives the avatar tint; normalised to snake_case. */
  type: string;
  /** Orders and labels the row. */
  loggedAt?: string;
  summary: string;
}

const UNNAMED = "Client";

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** First non-empty string among the given paths, e.g. "client.firstName". */
function pick(row: Record<string, unknown>, paths: string[]): string | undefined {
  for (const path of paths) {
    let cursor: unknown = row;
    for (const key of path.split(".")) {
      cursor = asRecord(cursor)?.[key];
      if (cursor === undefined) break;
    }
    const value = asString(cursor);
    if (value) return value;
  }
  return undefined;
}

function nameFrom(row: Record<string, unknown>): string {
  const direct = pick(row, [
    "clientName",
    "client.name",
    "client.fullName",
    "membership.client.name",
    "user.name",
    "name",
  ]);
  if (direct) return direct;

  // Split names, wherever they hang.
  for (const base of ["client", "membership.client", "user", ""]) {
    const prefix = base ? `${base}.` : "";
    const first = pick(row, [`${prefix}firstName`, `${prefix}givenName`]);
    const last = pick(row, [`${prefix}lastName`, `${prefix}familyName`]);
    const joined = [first, last].filter(Boolean).join(" ").trim();
    if (joined) return joined;
  }

  return pick(row, ["client.email", "user.email", "email"]) ?? UNNAMED;
}

function typeFrom(row: Record<string, unknown>): string {
  const raw =
    pick(row, ["type", "kind", "eventType", "activityType", "event"]) ?? "unknown";
  return raw
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

/** "Logged a workout" etc. — the floor when there's no detail to show. */
function labelForType(type: string): string {
  if (type.includes("workout") || type.includes("set") || type.includes("exercise")) {
    return "Logged a workout";
  }
  if (type.includes("meal") || type.includes("food") || type.includes("nutrition")) {
    return "Logged a meal";
  }
  if (type.includes("checkin") || type.includes("check_in")) return "Submitted a check-in";
  if (type.includes("measurement") || type.includes("weight")) return "Logged a measurement";
  if (type === "unknown") return "Logged activity";
  return `Logged ${type.replace(/_/g, " ")}`;
}

/** Human-readable detail out of a nested bag, when there's no summary string. */
function detailFrom(row: Record<string, unknown>): string | undefined {
  const bags = [row, asRecord(row.details), asRecord(row.payload), asRecord(row.data), asRecord(row.meta)];

  const parts: string[] = [];
  const title = bags
    .map(
      (bag) =>
        bag &&
        pick(bag, ["exerciseName", "mealName", "workoutName", "title", "label", "name"])
    )
    .find(Boolean);
  if (title) parts.push(title);

  for (const bag of bags) {
    if (!bag) continue;
    const sets = asString(bag.sets ?? bag.setCount);
    const reps = asString(bag.reps ?? bag.repCount);
    const weight = asString(bag.weightKg ?? bag.weight);
    const calories = asString(bag.calories ?? bag.kcal);
    if (sets) parts.push(`${sets} ${Number(sets) === 1 ? "set" : "sets"}`);
    if (reps && !sets) parts.push(`${reps} reps`);
    if (weight) parts.push(`${weight} kg`);
    if (calories) parts.push(`${calories} kcal`);
    if (parts.length > 1) break;
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function normalizeActivityRow(raw: unknown, index: number): ActivityRowView {
  const row = asRecord(raw) ?? {};
  const type = typeFrom(row);

  const summary =
    // A pre-formatted string is what the doc promises; the rest are fallbacks.
    pick(row, ["summary", "description", "text", "message"]) ??
    detailFrom(row) ??
    labelForType(type);

  // Display only — the feed is ordered by loggedAt, and many rows share a
  // training date, so this can never be allowed to sort anything. Today's date
  // is left off: it's the common case and adds nothing to the row.
  const trainingDate = pick(row, ["trainingDate", "date", "localDate"]);
  const showDate = trainingDate && trainingDate.slice(0, 10) !== localToday();

  return {
    id: pick(row, ["id", "eventId", "activityId"]) ?? `row-${index}`,
    membershipId: pick(row, ["membershipId", "membership.id", "clientMembershipId"]),
    clientName: nameFrom(row),
    type,
    loggedAt: pick(row, ["loggedAt", "createdAt", "occurredAt", "timestamp", "at"]),
    summary: showDate ? `${summary} · ${formatShortDate(trainingDate)}` : summary,
  };
}

/** Today as YYYY-MM-DD in the device's zone (not UTC, which flips early). */
function localToday(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * The whole response, defensively. The doc says the body is a bare array, but
 * an envelope (`{ items: [...] }`) is the other common shape and would throw on
 * `.map` before anything rendered — so unwrap the usual keys instead.
 */
export function toActivityRows(raw: unknown): ActivityRowView[] {
  if (Array.isArray(raw)) return raw.map(normalizeActivityRow);

  const envelope = asRecord(raw);
  if (envelope) {
    for (const key of ["items", "data", "rows", "results", "events"]) {
      const list = envelope[key];
      if (Array.isArray(list)) {
        if (__DEV__) {
          console.warn(
            `[activity] response was an envelope, not an array — rows came from "${key}". ` +
              `AnalyticsActivityRow[] in src/api/types.ts should be updated to match.`
          );
        }
        return list.map(normalizeActivityRow);
      }
    }
  }

  return [];
}

let described = false;

/**
 * Prints the real payload once per session so the guesses above can be replaced
 * with the actual field names. Remove this (and most of this file) once
 * `AnalyticsActivityRow` has been checked against a live response.
 */
export function describeActivityShape(rows: unknown[]): void {
  if (!__DEV__ || described || !Array.isArray(rows) || rows.length === 0) return;
  described = true;
  const first = asRecord(rows[0]);
  console.log(
    "[activity] first row keys:",
    first ? Object.keys(first).join(", ") : typeof rows[0]
  );
  console.log("[activity] first row:", JSON.stringify(rows[0], null, 2));
}

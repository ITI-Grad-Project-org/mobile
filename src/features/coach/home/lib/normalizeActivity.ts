
import { formatShortDate } from "./format";
import { asRecord, asString, nameFrom, pick } from "@/shared/utils/analyticsPayload";

export interface ActivityRowView {
  id: string;
  membershipId?: string;
  clientName: string;
  /** Drives the avatar tint; normalised to snake_case. */
  type: string;
  /** Orders and labels the row. */
  loggedAt?: string;
  /**
   * The client's own training day (`activityDate`). Display and BUCKETING only
   * — never sorting, since many rows share one value. Kept separate from the
   * summary so the week chart can count by the day trained rather than the
   * instant logged, which differ either side of midnight.
   */
  trainingDate?: string;
  summary: string;
}

function typeFrom(row: Record<string, unknown>): string {
  const raw =
    pick(row, ["activityType", "type", "kind", "eventType", "event"]) ?? "unknown";
  return raw
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

/**
 * The row's caption. The response carries no summary — only `activityType` —
 * so this IS the line, not a fallback. Phrased as what the client did.
 */
function labelForType(type: string): string {
  if (type.includes("workout") || type.includes("set") || type.includes("exercise")) {
    return "Logged a workout";
  }
  if (type.includes("meal") || type.includes("food") || type.includes("nutrition")) {
    return "Logged a meal";
  }
  if (type.includes("checkin") || type.includes("check_in")) return "Submitted a check-in";
  if (type.includes("measurement") || type.includes("weight")) return "Logged a measurement";
  if (type.includes("water") || type.includes("hydration")) return "Logged water";
  if (type === "unknown") return "Logged activity";
  // Unknown kind: strip the event-y suffix and read the verb back out, so
  // "sleep_logged" becomes "Logged sleep" rather than "Logged sleep logged".
  const subject = type.replace(/_(reported|logged|created|completed|submitted)$/, "");
  return `Logged ${subject.replace(/_/g, " ")}`;
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

  // Display only — the feed is ordered by occurredAt, and many rows share a
  // training date, so this can never be allowed to sort anything. Today's date
  // is left off: it's the common case and adds nothing to the row.
  const trainingDate = pick(row, ["activityDate", "trainingDate", "date", "localDate"]);
  const showDate = trainingDate && trainingDate.slice(0, 10) !== localToday();

  const membershipId = pick(row, ["membershipId", "membership.id", "clientMembershipId"]);
  const occurredAt = pick(row, ["occurredAt", "loggedAt", "createdAt", "timestamp", "at"]);

  return {
    // The response has no id, so the key is composed. membershipId + the
    // instant is unique in practice: one client can't log two things in the
    // same millisecond. The index keeps it stable if either is ever missing.
    id: pick(row, ["id", "eventId", "activityId"]) ?? `${membershipId ?? "row"}-${occurredAt ?? index}`,
    membershipId,
    clientName: nameFrom(row),
    type,
    loggedAt: occurredAt,
    trainingDate,
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

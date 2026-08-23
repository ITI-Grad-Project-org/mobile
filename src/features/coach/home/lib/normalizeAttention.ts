import type { Attention } from "@/api/types";

import { asRecord, nameFrom, pick, pickBool, pickList, pickNumber } from "@/shared/utils/analyticsPayload";

/**
 * The attention queues, made shape-tolerant.
 *
 * Same problem as the activity feed: no response schema exists, so if the API
 * spells a queue `checkIns` rather than `checkinsAwaitingReview`, plain field
 * access yields undefined and the screen renders "No check-ins waiting" — a
 * confident, wrong answer. Reading every plausible spelling makes a missing
 * queue mean "the API sent nothing", which is the only case that should ever
 * produce that copy.
 */

const QUEUE_KEYS = {
  atRisk: ["atRisk", "at_risk", "atRiskClients", "silentClients", "quietClients"],
  checkins: [
    "checkinsAwaitingReview",
    "checkInsAwaitingReview",
    "checkins_awaiting_review",
    "pendingCheckins",
    "pendingCheckIns",
    "checkinsPendingReview",
    "checkIns",
    "checkins",
  ],
  ending: [
    "programsEndingSoon",
    "programmesEndingSoon",
    "programs_ending_soon",
    "endingSoon",
    "programsEnding",
  ],
};

/** Where a last-activity instant hides when the payload sends one. */
const LAST_ACTIVITY_KEYS = [
  "lastActivityAt",
  "last_activity_at",
  "lastActiveAt",
  "lastLoggedAt",
  "lastSeenAt",
  "lastActivityDate",
  "silentSince",
  "since",
];

/** Join-date spellings — only read for a neverActive row, where the silence is
 *  counted from when they joined rather than from an activity they never had. */
const JOINED_KEYS = ["joinedAt", "joined_at", "startedAt", "memberSince", "createdAt"];

/** Whole days between an instant (timestamp or YYYY-MM-DD) and now, floored at
 *  0. null when there is nothing parseable to measure from. */
function daysBetween(iso: string | undefined): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

export function normalizeAttention(raw: unknown): Attention | undefined {
  if (raw === undefined || raw === null) return undefined;

  const atRisk = pickList(raw, QUEUE_KEYS.atRisk).map((item) => {
    const row = asRecord(item) ?? {};
    const neverActive = pickBool(row, ["neverActive", "never_active", "hasNeverLogged"]);
    // The instant the silence is measured from: the last activity normally,
    // the join date for someone who never started. Read even when a count came
    // back, since the detail screen dates the row from it.
    const silentSince = pick(row, [
      ...LAST_ACTIVITY_KEYS,
      ...(neverActive ? JOINED_KEYS : []),
    ]);
    const counted = pickNumber(row, [
      "daysSilent",
      "silentDays",
      "daysSinceLastActivity",
      "days_since_last_activity",
      "daysSinceActivity",
      "daysInactive",
      "inactiveDays",
      "daysSinceLastLog",
      "daysSinceJoin",
      "daysSinceJoined",
      "days",
    ]);
    return {
      membershipId:
        pick(row, ["membershipId", "membership.id", "clientMembershipId", "id"]) ?? "",
      clientName: nameFrom(row),
      // A count if one was sent, else derived from the timestamp, else null.
      // NOT `?? 0`: reaching this queue means silence past the threshold, so a
      // rendered "0 days" is a missing field masquerading as a measurement.
      daysSilent: counted ?? daysBetween(silentSince),
      silentSince,
      // Counted from the join date rather than a last activity — the copy has
      // to change, so a missing flag must default to the safer wording.
      neverActive,
    };
  });

  const checkinsAwaitingReview = pickList(raw, QUEUE_KEYS.checkins).map((item) => {
    const row = asRecord(item) ?? {};
    return {
      checkinId: pick(row, ["checkinId", "checkInId", "id"]) ?? "",
      membershipId: pick(row, ["membershipId", "membership.id", "clientMembershipId"]) ?? "",
      clientName: nameFrom(row),
      submittedAt:
        pick(row, ["submittedAt", "submitted_at", "createdAt", "occurredAt", "date"]) ?? "",
    };
  });

  const programsEndingSoon = pickList(raw, QUEUE_KEYS.ending).map((item) => {
    const row = asRecord(item) ?? {};
    const completion = pickNumber(row, [
      "completionPct",
      "completionPercent",
      "completionPercentage",
      "completion",
    ]);
    return {
      programId: pick(row, ["programId", "id"]) ?? "",
      membershipId: pick(row, ["membershipId", "membership.id", "clientMembershipId"]) ?? "",
      clientName: nameFrom(row),
      programName: pick(row, ["programName", "program.name", "name"]) ?? "",
      // Live responses use `endsOn`; the older spellings stay as insurance.
      endsOn: pick(row, ["endsOn", "endDate", "end_date", "endsAt"]) ?? "",
      daysRemaining: pickNumber(row, ["daysRemaining", "days_remaining"]) ?? 0,
      // undefined (absent) and null (no denominator) both render as a dash;
      // never as 0, which would read as "nothing done".
      completionPct: completion === undefined ? null : completion,
    };
  });

  return { atRisk, checkinsAwaitingReview, programsEndingSoon };
}

let described = false;

/**
 * Prints the payload once per session. If a queue looks empty in the UI, this
 * is what separates "the API sent an empty list" from "the API sent a key we
 * don't read" — and the top-level keys are the fastest way to tell.
 */
export function describeAttentionShape(raw: unknown): void {
  if (!__DEV__ || described || raw === undefined) return;
  described = true;
  const root = asRecord(raw);
  console.log(
    "[attention] top-level keys:",
    root ? Object.keys(root).join(", ") : typeof raw
  );
  console.log("[attention] payload:", JSON.stringify(raw, null, 2));
}

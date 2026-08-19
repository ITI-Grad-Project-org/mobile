import * as SecureStore from "expo-secure-store";

/** clientId -> measuredAt of the newest check-in reviewed for that client. */
export type ReviewWatermarks = Record<string, string>;

/**
 * A roster is bounded, but archived clients accumulate — so the map is capped
 * and the oldest watermarks are dropped first. Losing one only means a stale
 * client's check-ins look unread again.
 */
const MAX_CLIENTS_STORED = 300;

export function checkinReviewsKey(tenantId: string): string {
  return `checkin_reviews_${tenantId}`;
}

/** Dates are compared by day: measuredAt may or may not carry a time part. */
export function reviewDay(iso: string): string {
  return iso.slice(0, 10);
}

/** True when `measuredAt` falls on or before the client's watermark. */
export function isCoveredBy(watermark: string | undefined, measuredAt: string): boolean {
  if (!watermark) return false;
  return reviewDay(measuredAt) <= reviewDay(watermark);
}

function prune(marks: ReviewWatermarks): ReviewWatermarks {
  const entries = Object.entries(marks);
  if (entries.length <= MAX_CLIENTS_STORED) return marks;
  entries.sort((a, b) => b[1].localeCompare(a[1]));
  return Object.fromEntries(entries.slice(0, MAX_CLIENTS_STORED));
}

export async function readCheckinReviews(tenantId: string): Promise<ReviewWatermarks> {
  try {
    const raw = await SecureStore.getItemAsync(checkinReviewsKey(tenantId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    // A hand-edited or half-written value shouldn't poison every comparison
    // downstream, so anything non-string is dropped rather than trusted.
    const out: ReviewWatermarks = {};
    for (const [clientId, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.length >= 10) out[clientId] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export async function writeCheckinReviews(
  tenantId: string,
  marks: ReviewWatermarks
): Promise<void> {
  try {
    await SecureStore.setItemAsync(checkinReviewsKey(tenantId), JSON.stringify(prune(marks)));
  } catch {
    // Review state is a convenience. A failed write must not break the screen —
    // the worst case is the check-in looks unread again next launch.
  }
}

import { useCallback, useSyncExternalStore } from "react";

/**
 * The "already read" watermark for reviews.
 *
 * Nothing server-side records that a coach has seen a review — there is no
 * read flag on the resource and no endpoint to set one — so this is the app's
 * own mark, held in memory for the session the way dismissed insights are.
 * It resets on relaunch, which is the honest trade: it can repeat a row it
 * already showed, but it can never claim a review was read when it wasn't.
 *
 * Held as a module value with subscribers rather than in a hook: Home and the
 * Reviews screen are different trees, and opening the list has to make Home's
 * row disappear when you come back.
 *
 * Keyed by tenant, because a user can own more than one — a watermark carried
 * across a tenant switch would silently hide the other practice's new reviews.
 */

/** tenantId -> the newest review time (ms) marked read in this session. */
const seenAt = new Map<string, number>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Moves a tenant's watermark forward to `timestamp` (ms). Never backwards:
 * marking an older review read must not resurrect the newer ones above it.
 */
export function markReviewsSeen(
  tenantId: string | null | undefined,
  timestamp: number | null
): void {
  if (!tenantId || timestamp === null) return;
  const current = seenAt.get(tenantId);
  if (current !== undefined && timestamp <= current) return;
  seenAt.set(tenantId, timestamp);
  for (const listener of listeners) listener();
}

export function useReviewsSeenAt(tenantId: string | null | undefined): number | null {
  const getSnapshot = useCallback(
    () => (tenantId ? (seenAt.get(tenantId) ?? null) : null),
    [tenantId]
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

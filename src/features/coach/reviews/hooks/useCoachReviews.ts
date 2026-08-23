import { useGetCoachReviewsQuery } from "@/api/endpoints/reviews.endpoints";
import {
  describeReviewsShape,
  normalizeReviews,
  reviewTimestamp,
  sortReviewsNewestFirst,
} from "@/features/shared/reviews/lib/normalizeReviews";
import type { CoachReview } from "@/features/shared/reviews/types";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { useCallback, useMemo } from "react";

import { markReviewsSeen, useReviewsSeenAt } from "../lib/seenReviews";

/**
 * How far back a review still counts as news worth a Home row. Past this it is
 * still on the Reviews screen — it just stops asking for attention.
 */
export const NEW_REVIEW_WINDOW_DAYS = 7;

/** Stable identity, so an empty result doesn't re-trigger downstream memos. */
const NONE: CoachReview[] = [];

/** Milliseconds `days` before now. Its own function so the clock is read once,
 *  the way format.ts wraps the same read for the day counts. */
function msDaysAgo(days: number): number {
  return Date.now() - days * 86_400_000;
}

export interface CoachReviews {
  /** Every review this coach has, newest first. */
  all: CoachReview[];
  /** Written inside the window and not yet marked seen this session. */
  unseen: CoachReview[];
  /** The newest review's write time in ms, or null when there are none. */
  latestAt: number | null;
  /** False until the list has loaded — `all` and `unseen` mean nothing yet. */
  hydrated: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
  /** Moves the watermark to the newest review — everything is now read. */
  markAllSeen: () => void;
}

/**
 * The reviews a coach has received, from GET /reviews/me.
 *
 * One request for the whole tenant (the endpoint resolves it from the JWT), so
 * Home and the Reviews screen share a single RTK cache entry — opening the
 * list off Home's row is usually a cache read rather than a round trip.
 */
export function useCoachReviews(): CoachReviews {
  const { tenantId } = useActiveTenant();
  const query = useGetCoachReviewsQuery(
    { tenantId: tenantId ?? "" },
    {
      skip: !tenantId,
      // Reviews are written on OTHER people's devices, so nothing this app does
      // invalidates the cache. Without these the list stays as it was on first
      // load for as long as a coach screen is mounted.
      refetchOnFocus: true,
      refetchOnMountOrArgChange: 30,
    }
  );
  const seenAt = useReviewsSeenAt(tenantId);

  const all = useMemo(() => {
    describeReviewsShape(query.data);
    const rows = sortReviewsNewestFirst(normalizeReviews(query.data));
    return rows.length > 0 ? rows : NONE;
  }, [query.data]);

  const latestAt = useMemo(() => {
    for (const review of all) {
      const at = reviewTimestamp(review);
      // Sorted newest first, so the first parseable date is the newest one.
      if (at !== null) return at;
    }
    return null;
  }, [all]);

  const unseen = useMemo(() => {
    const cutoff = msDaysAgo(NEW_REVIEW_WINDOW_DAYS);
    const floor = seenAt !== null ? Math.max(cutoff, seenAt) : cutoff;
    // A review with no usable date is left out rather than assumed recent —
    // it would otherwise sit on Home forever, since the watermark can never
    // move past a timestamp that doesn't exist.
    const rows = all.filter((review) => {
      const at = reviewTimestamp(review);
      return at !== null && at > floor;
    });
    return rows.length > 0 ? rows : NONE;
  }, [all, seenAt]);

  const markAllSeen = useCallback(
    () => markReviewsSeen(tenantId, latestAt),
    [tenantId, latestAt]
  );

  const { refetch: refetchReviews } = query;
  const refetch = useCallback(() => {
    if (tenantId) refetchReviews();
  }, [tenantId, refetchReviews]);

  return {
    all,
    unseen,
    latestAt,
    // isSuccess rather than !isLoading: an errored query has no list, and
    // treating that as "no reviews" is the wrong answer for both callers.
    hydrated: query.isSuccess,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch,
    markAllSeen,
  };
}

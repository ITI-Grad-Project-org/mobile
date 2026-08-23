import {
  useListPendingReviewsQuery,
  useReviewMeasurementMutation,
} from "@/api/endpoints/measurements.endpoints";
import { unwrapList, unwrapTotal } from "@/api/pagination";
import type { Measurement, PendingMeasurement } from "@/api/types";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { useCallback, useMemo } from "react";

/**
 * Rows pulled in one page. The queue is what the coach still has to read, so a
 * tenant sitting on more than this has a backlog problem rather than a paging
 * one — and `pendingTotal` still reports the true size from `meta.total`.
 */
export const PENDING_PAGE_SIZE = 200;

let loggedPendingShape = false;

/**
 * Prints the pending response once.
 *
 * /measurements/reviews/pending has no response schema in the OpenAPI doc, and
 * this hook infers "reviewed" from ABSENCE in it — so an empty or
 * narrowly-scoped list silently marks the whole tenant read. This is how you
 * see which it is.
 */
function describePendingShape(raw: unknown, rows: PendingMeasurement[]): void {
  if (!__DEV__ || loggedPendingShape) return;
  loggedPendingShape = true;
  console.log("[pending] rows:", rows.length, "total:", unwrapTotal(raw, rows.length));
  console.log("[pending] payload:", JSON.stringify(raw, null, 2));
}

/** Stable identities, so an empty result doesn't re-trigger downstream memos. */
const NO_ROWS: PendingMeasurement[] = [];
const NO_IDS: ReadonlySet<string> = new Set();

/** What one bulk mark actually managed to write. */
export interface MarkReviewedResult {
  reviewed: number;
  failed: number;
}

export interface CheckinReviews {
  /** False until the pending queue has loaded. Not needed to read `isReviewed`. */
  hydrated: boolean;
  /** Re-reads the queue. For pull-to-refresh — the writes invalidate it. */
  refetch: () => void;
  /** Unreviewed check-ins across the tenant, as the server returned them. */
  pending: PendingMeasurement[];
  /** Ids of everything in `pending`. Never a substitute for `isReviewed`. */
  pendingIds: ReadonlySet<string>;
  /** Tenant-wide count, which can exceed `pending.length` (see the page size). */
  pendingTotal: number;
  /** True when this measurement carries a review — read off the row itself. */
  isReviewed: (measurement: Measurement) => boolean;
  /**
   * Marks measurements reviewed server-side. One-way: the API has no un-review
   * route, so there is nothing to undo with.
   */
  markReviewed: (
    measurementIds: string[],
    options?: { clientId?: string; coachFeedback?: string }
  ) => Promise<MarkReviewedResult>;
  isMarking: boolean;
}

/**
 * Which check-ins still need the coach's eyes, straight from the server.
 *
 * Two server sources, and they answer different questions. Whether a given
 * measurement has been reviewed is read off the measurement itself
 * (`reviewedAt`); GET /measurements/reviews/pending is the tenant-wide QUEUE of
 * what hasn't been, for screens that need the list rather than a verdict.
 *
 * Either way the state is the server's, not the device's, and no longer a
 * per-client "read through this date" watermark. Marking is per MEASUREMENT and
 * cannot be taken back: PATCH /measurements/{id}/review is the only write.
 */
export function useCheckinReviews(): CheckinReviews {
  const { tenantId } = useActiveTenant();

  const pendingQuery = useListPendingReviewsQuery(
    { tenantId: tenantId ?? "", limit: PENDING_PAGE_SIZE },
    {
      skip: !tenantId,
      // This queue fills up from OTHER people's devices — a client logging a
      // check-in raises nothing this app can invalidate on. Without these it
      // stays as it was on first load for as long as a coach screen is
      // mounted, and new check-ins never arrive.
      refetchOnFocus: true,
      refetchOnMountOrArgChange: 30,
    }
  );
  const [reviewMeasurement, { isLoading: isMarking }] = useReviewMeasurementMutation();

  const { pending, pendingIds, pendingTotal } = useMemo(() => {
    if (!pendingQuery.data) {
      return { pending: NO_ROWS, pendingIds: NO_IDS, pendingTotal: 0 };
    }
    // Rows arrive under `docs`, not `data` — see src/api/pagination.ts.
    const rows = unwrapList<PendingMeasurement>(pendingQuery.data).filter(
      (row) => typeof row?.id === "string" && typeof row?.measuredAt === "string"
    );
    describePendingShape(pendingQuery.data, rows);
    return {
      pending: rows.length > 0 ? rows : NO_ROWS,
      pendingIds: new Set(rows.map((row) => row.id)),
      pendingTotal: unwrapTotal(pendingQuery.data, rows.length),
    };
  }, [pendingQuery.data]);

  // `isSuccess` rather than `!isLoading`: a failed read leaves the queue
  // unknown, and claiming everything is reviewed is the wrong way to be wrong.
  const hydrated = pendingQuery.isSuccess;

  /**
   * The row carries its own answer, so that is the whole test.
   *
   * Deliberately NOT "absent from the pending list": absence is not evidence.
   * An empty page, a server-side scoping this client can't see, or a tenant
   * whose measurements the queue simply doesn't cover would each turn every
   * check-in in the app into a reviewed one — which is exactly what happened
   * when this was inferred rather than read.
   */
  const isReviewed = useCallback(
    (measurement: Measurement) => typeof measurement.reviewedAt === "string",
    []
  );

  const markReviewed = useCallback<CheckinReviews["markReviewed"]>(
    async (measurementIds, options) => {
      if (!tenantId || measurementIds.length === 0) return { reviewed: 0, failed: 0 };

      // Fired together so a client's backlog is one round trip's wait rather
      // than one per check-in; the invalidations they raise land in the same
      // tick and collapse into a single refetch of the pending list.
      const settled = await Promise.all(
        measurementIds.map((measurementId) =>
          reviewMeasurement({
            measurementId,
            tenantId,
            clientId: options?.clientId,
            coachFeedback: options?.coachFeedback,
          })
            .unwrap()
            .then(() => true)
            // A 404 means it is already gone from this tenant; anything else is
            // transient. Neither should abandon the rest of the batch.
            .catch(() => false)
        )
      );

      const reviewed = settled.filter(Boolean).length;
      return { reviewed, failed: settled.length - reviewed };
    },
    [tenantId, reviewMeasurement]
  );

  const { refetch: refetchPending } = pendingQuery;
  const refetch = useCallback(() => {
    if (tenantId) refetchPending();
  }, [tenantId, refetchPending]);

  return useMemo<CheckinReviews>(
    () => ({
      hydrated,
      pending,
      pendingIds,
      pendingTotal,
      isReviewed,
      markReviewed,
      isMarking,
      refetch,
    }),
    [hydrated, pending, pendingIds, pendingTotal, isReviewed, markReviewed, isMarking, refetch]
  );
}

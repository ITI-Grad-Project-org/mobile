import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import {
  isCoveredBy,
  readCheckinReviews,
  writeCheckinReviews,
  type ReviewWatermarks,
} from "@/shared/utils/checkinReviews";
import { useAppDispatch, useAppSelector } from "@/store";
import { hydrateTenantReviews, setReviewedThrough } from "@/store/checkinReviewsSlice";
import { useCallback, useEffect, useMemo } from "react";

/** Stable identity, so a tenant with no marks doesn't re-trigger memos. */
const NONE: ReviewWatermarks = {};

export interface CheckinReviews {
  /** False until storage has been read — don't render "all caught up" yet. */
  hydrated: boolean;
  /** True when this check-in falls on or before the client's watermark. */
  isReviewed: (clientId: string, measuredAt: string) => boolean;
  /** The newest reviewed date for a client, or undefined if none. */
  reviewedThrough: (clientId: string) => string | undefined;
  /**
   * Marks everything up to and including `measuredAt` as read, and returns the
   * watermark it replaced so the caller can offer an undo.
   */
  markReviewed: (clientId: string, measuredAt: string) => string | undefined;
  /** Restores a previous watermark; `null` puts the client back to unread. */
  restore: (clientId: string, measuredAt: string | null) => void;
}

/**
 * Read/write access to the device-local "I've reviewed this" state.
 *
 * The store holds the marks so every screen sees a change in the same tick;
 * SecureStore holds the durable copy. Both are written on every mark — the
 * write is fire-and-forget because a failed persist should cost the coach the
 * mark on next launch, not the tap.
 */
export function useCheckinReviews(): CheckinReviews {
  const dispatch = useAppDispatch();
  const { tenantId } = useActiveTenant();

  const marks = useAppSelector((state) =>
    tenantId ? state.checkinReviews.byTenant[tenantId] : undefined
  );
  const hydrated = useAppSelector((state) =>
    tenantId ? state.checkinReviews.hydratedTenants.includes(tenantId) : false
  );
  const current = marks ?? NONE;

  useEffect(() => {
    if (!tenantId || hydrated) return;
    let cancelled = false;
    readCheckinReviews(tenantId).then((stored) => {
      if (!cancelled) dispatch(hydrateTenantReviews({ tenantId, marks: stored }));
    });
    return () => {
      cancelled = true;
    };
  }, [tenantId, hydrated, dispatch]);

  const persist = useCallback(
    (clientId: string, measuredAt: string | null) => {
      if (!tenantId) return;
      dispatch(setReviewedThrough({ tenantId, clientId, measuredAt }));
      const next = { ...current };
      if (measuredAt) next[clientId] = measuredAt;
      else delete next[clientId];
      void writeCheckinReviews(tenantId, next);
    },
    [tenantId, dispatch, current]
  );

  return useMemo<CheckinReviews>(
    () => ({
      hydrated,
      isReviewed: (clientId, measuredAt) => isCoveredBy(current[clientId], measuredAt),
      reviewedThrough: (clientId) => current[clientId],
      markReviewed: (clientId, measuredAt) => {
        const previous = current[clientId];
        // Never walk the watermark backwards: marking an older entry read
        // while a newer one is already read would resurrect the newer one.
        if (!isCoveredBy(previous, measuredAt)) persist(clientId, measuredAt);
        return previous;
      },
      restore: (clientId, measuredAt) => persist(clientId, measuredAt),
    }),
    [hydrated, current, persist]
  );
}

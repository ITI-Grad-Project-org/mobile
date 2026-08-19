import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { ReviewWatermarks } from '@/shared/utils/checkinReviews';

/**
 * Which check-ins the coach has marked reviewed, per tenant.
 *
 * Device-local: the API exposes no review state (see shared/utils/checkinReviews).
 * The persisted copy lives in SecureStore; this slice is the in-memory mirror so
 * a mark shows up on every screen in the same tick.
 *
 * Per-tenant because a coach's roster is per-tenant — reviewing a client in one
 * tenant says nothing about a different tenant's queue.
 */
interface CheckinReviewsState {
  byTenant: Record<string, ReviewWatermarks>;
  /** Tenants already loaded from storage, so hydration runs once each. */
  hydratedTenants: string[];
}

const initialState: CheckinReviewsState = {
  byTenant: {},
  hydratedTenants: [],
};

const checkinReviewsSlice = createSlice({
  name: 'checkinReviews',
  initialState,
  reducers: {
    hydrateTenantReviews(
      state,
      action: PayloadAction<{ tenantId: string; marks: ReviewWatermarks }>
    ) {
      const { tenantId, marks } = action.payload;
      // Anything marked while the read was in flight wins — it is newer than
      // what was on disk when hydration started.
      state.byTenant[tenantId] = { ...marks, ...(state.byTenant[tenantId] ?? {}) };
      if (!state.hydratedTenants.includes(tenantId)) state.hydratedTenants.push(tenantId);
    },
    /** `measuredAt: null` clears the client's watermark — the undo path. */
    setReviewedThrough(
      state,
      action: PayloadAction<{ tenantId: string; clientId: string; measuredAt: string | null }>
    ) {
      const { tenantId, clientId, measuredAt } = action.payload;
      const marks = (state.byTenant[tenantId] ??= {});
      if (measuredAt) marks[clientId] = measuredAt;
      else delete marks[clientId];
    },
    clearCheckinReviews() {
      return initialState;
    },
  },
});

export const { hydrateTenantReviews, setReviewedThrough, clearCheckinReviews } =
  checkinReviewsSlice.actions;
export default checkinReviewsSlice.reducer;

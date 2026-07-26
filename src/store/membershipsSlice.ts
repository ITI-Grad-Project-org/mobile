import { createEntityAdapter, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Membership } from '@/api/types';

export interface ReduxMembership extends Membership {
  id: string;
}

function normalizeMembership(m: any): ReduxMembership {
  const tenantId = m?.tenantId || m?.tenant?.id || m?.id || '';
  const tenantName = m?.tenantName || m?.tenant?.name || 'Coaching';
  return {
    ...m,
    tenantId,
    tenantName,
    role: m?.role || 'client',
    status: m?.status || 'active',
    id: tenantId,
  };
}

const membershipsAdapter = createEntityAdapter<ReduxMembership>();

const membershipsSlice = createSlice({
  name: 'memberships',
  initialState: membershipsAdapter.getInitialState(),
  reducers: {
    setMemberships: (state, action: PayloadAction<any[]>) => {
      const mapped = (action.payload || [])
        .map(normalizeMembership)
        .filter((m) => Boolean(m.tenantId));
      membershipsAdapter.setAll(state, mapped);
    },
    upsertMembership: (state, action: PayloadAction<any>) => {
      const normalized = normalizeMembership(action.payload);
      if (normalized.tenantId) {
        membershipsAdapter.upsertOne(state, normalized);
      }
    },
    removeMembership: membershipsAdapter.removeOne,
    clearMemberships: membershipsAdapter.removeAll,
  },
});

export const { setMemberships, upsertMembership, removeMembership, clearMemberships } = membershipsSlice.actions;
export const membershipsSelectors = membershipsAdapter.getSelectors();
export default membershipsSlice.reducer;

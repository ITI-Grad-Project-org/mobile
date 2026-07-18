import { createEntityAdapter, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Membership } from '@/api/types';

export interface ReduxMembership extends Membership {
  id: string;
}

const membershipsAdapter = createEntityAdapter<ReduxMembership>();

const membershipsSlice = createSlice({
  name: 'memberships',
  initialState: membershipsAdapter.getInitialState(),
  reducers: {
    setMemberships: (state, action: PayloadAction<Membership[]>) => {
      const mapped = action.payload.map((m) => ({ ...m, id: m.tenantId }));
      membershipsAdapter.setAll(state, mapped);
    },
    upsertMembership: (state, action: PayloadAction<Membership>) => {
      membershipsAdapter.upsertOne(state, { ...action.payload, id: action.payload.tenantId });
    },
    removeMembership: membershipsAdapter.removeOne,
    clearMemberships: membershipsAdapter.removeAll,
  },
});

export const { setMemberships, upsertMembership, removeMembership, clearMemberships } = membershipsSlice.actions;
export const membershipsSelectors = membershipsAdapter.getSelectors();
export default membershipsSlice.reducer;

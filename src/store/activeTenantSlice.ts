import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ActiveTenantState {
  tenantId: string | null;
}

const initialState: ActiveTenantState = {
  tenantId: null,
};

const activeTenantSlice = createSlice({
  name: 'activeTenant',
  initialState,
  reducers: {
    setActiveTenant: (state, action: PayloadAction<string | null>) => {
      state.tenantId = action.payload;
    },
    clearActiveTenant: (state) => {
      state.tenantId = null;
    },
  },
});

export const { setActiveTenant, clearActiveTenant } = activeTenantSlice.actions;
export default activeTenantSlice.reducer;

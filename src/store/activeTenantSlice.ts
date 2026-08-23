import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ActiveTenantState {
  tenantId: string | null;
  /**
   * True from the moment a tenant switch starts until the new credentials and
   * cache reset are in place. The root layout holds the splash over the whole
   * window so no screen is ever painted with a half-switched tenant.
   */
  switching: boolean;
}

const initialState: ActiveTenantState = {
  tenantId: null,
  switching: false,
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
      state.switching = false;
    },
    setTenantSwitching: (state, action: PayloadAction<boolean>) => {
      state.switching = action.payload;
    },
  },
});

export const { setActiveTenant, clearActiveTenant, setTenantSwitching } =
  activeTenantSlice.actions;
export default activeTenantSlice.reducer;

import { markTokensCleared, markTokensRotated } from '@/api/tokenGeneration';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  persona: 'coach' | 'customer' | null;
  profileCompleted: boolean;
  loading: boolean;
  /**
   * True from the moment a login succeeds until the destination screen has been
   * routed to. The root layout holds the branded splash over that window, which
   * hides the tenant prime, the profile fetch and the redirect behind one
   * animation instead of a flash of the auth screen and a half-loaded tab.
   */
  entering: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  userId: null,
  persona: null,
  profileCompleted: false,
  loading: true,
  entering: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ userId: string; persona: 'coach' | 'customer'; profileCompleted?: boolean }>) => {
      state.isAuthenticated = true;
      state.userId = action.payload.userId;
      state.persona = action.payload.persona;
      state.profileCompleted = action.payload.profileCompleted ?? false;
      state.loading = false;
    },
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.userId = null;
      state.persona = null;
      state.profileCompleted = false;
      state.loading = false;
      state.entering = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setEnteringApp: (state, action: PayloadAction<boolean>) => {
      state.entering = action.payload;
    },
  },
});

export const { setAuth, clearAuth, setLoading, setEnteringApp } =
  authSlice.actions;
export default authSlice.reducer;

export const saveTokens = async (
  accessToken: string,
  refreshToken: string,
  persona: 'coach' | 'customer',
  email?: string
) => {
  await SecureStore.setItemAsync('accessToken', accessToken);
  await SecureStore.setItemAsync('refreshToken', refreshToken);
  await SecureStore.setItemAsync('persona', persona);
  if (email) {
    await SecureStore.setItemAsync('userEmail', email.toLowerCase().trim());
  }
  // Login, refresh and the tenant switch all land here — so this is the one
  // place that can tell the reauth wrapper the token it 401'd on is now old.
  markTokensRotated();
};

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
  await SecureStore.deleteItemAsync('persona');
  await SecureStore.deleteItemAsync('userEmail');
  markTokensCleared();
};

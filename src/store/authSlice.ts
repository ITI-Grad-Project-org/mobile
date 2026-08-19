import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  persona: 'coach' | 'customer' | null;
  profileCompleted: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  userId: null,
  persona: null,
  profileCompleted: false,
  loading: true,
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
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setAuth, clearAuth, setLoading } = authSlice.actions;
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
};

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
  await SecureStore.deleteItemAsync('persona');
  await SecureStore.deleteItemAsync('userEmail');
};

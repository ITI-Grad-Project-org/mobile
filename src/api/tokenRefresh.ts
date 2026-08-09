import { saveTokens } from '@/store/authSlice';
import * as SecureStore from 'expo-secure-store';

import { BASE_URL } from './config';

let inFlight: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const persona = (await SecureStore.getItemAsync('persona')) as
    | 'coach'
    | 'customer'
    | null;
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  if (!persona || !refreshToken) return false;

  const path = persona === 'coach' ? '/auth/refresh' : '/auth/customer/refresh';
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${refreshToken}` },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!data?.accessToken || !data?.refreshToken) return false;
    await saveTokens(data.accessToken, data.refreshToken, persona);
    return true;
  } catch {
    return false;
  }
}

/** Refresh the token pair, joining any refresh already running. */
export function refreshAccessToken(): Promise<boolean> {
  if (!inFlight) {
    inFlight = doRefresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

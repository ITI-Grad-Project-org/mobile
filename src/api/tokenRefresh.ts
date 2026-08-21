import { saveTokens } from '@/store/authSlice';
import * as SecureStore from 'expo-secure-store';

import { BASE_URL } from './config';

/**
 * Why a refresh ended the way it did — because only ONE of these means the
 * session is dead:
 *
 * - `refreshed`   a new pair is in SecureStore.
 * - `rejected`    the server refused the refresh token itself (401/403), or
 *                 there is no refresh token to spend. The session is over.
 * - `unavailable` we never got an answer: offline, DNS, timeout, 5xx, garbage
 *                 body. Says NOTHING about the session — the caller must keep
 *                 the user signed in and just surface the original failure.
 *
 * Collapsing the last two into "false" is what made a flaky connection (or one
 * route that reliably 401s) log people out.
 */
export type RefreshOutcome = 'refreshed' | 'rejected' | 'unavailable';

/** A refresh that never answers must not wedge every joined caller. */
const REFRESH_TIMEOUT_MS = 20_000;

let inFlight: Promise<RefreshOutcome> | null = null;

async function doRefresh(): Promise<RefreshOutcome> {
  const persona = (await SecureStore.getItemAsync('persona')) as
    | 'coach'
    | 'customer'
    | null;
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  if (!persona || !refreshToken) return 'rejected';

  const path = persona === 'coach' ? '/auth/refresh' : '/auth/customer/refresh';
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), REFRESH_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${refreshToken}` },
      signal: abort.signal,
    });

    // The only verdicts on the refresh token itself. Everything else is the
    // transport or the server having a bad day.
    if (res.status === 401 || res.status === 403) return 'rejected';
    if (!res.ok) return 'unavailable';

    const data = (await res.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    // A 200 we can't read is a server/deploy problem, not a dead session.
    if (!data?.accessToken || !data?.refreshToken) return 'unavailable';

    // saveTokens bumps the token generation for us.
    await saveTokens(data.accessToken, data.refreshToken, persona);
    return 'refreshed';
  } catch {
    // Offline, DNS, aborted — nothing was said about the session.
    return 'unavailable';
  } finally {
    clearTimeout(timer);
  }
}

/** Refresh the token pair, joining any refresh already running. */
export function refreshSession(): Promise<RefreshOutcome> {
  if (!inFlight) {
    inFlight = doRefresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** Did we end up with a usable token? For callers that can't act on the why. */
export async function refreshAccessToken(): Promise<boolean> {
  return (await refreshSession()) === 'refreshed';
}

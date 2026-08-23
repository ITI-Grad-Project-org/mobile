/**
 * Which token pair is currently in SecureStore, and when it landed.
 *
 * Its own module (like `tenantEpoch`) so `authSlice.saveTokens` — the single
 * writer, used by login, refresh AND the tenant switch — can bump it without
 * importing the API layer that reads it.
 *
 * `baseQueryWithReauth` uses it to tell "my token is stale" apart from "this
 * route refuses my token": a request that 401s while the generation has moved
 * since it started was simply holding the previous token, so it needs a retry
 * rather than another spend of the single-use refresh token.
 */
let generation = 0;
let mintedAt = 0;

export function tokenGeneration(): number {
  return generation;
}

/** When the stored access token was written, or 0 if none was this session. */
export function tokensMintedAt(): number {
  return mintedAt;
}

export function markTokensRotated(): void {
  generation += 1;
  mintedAt = Date.now();
}

/** Logout: there is no token now, so nothing in flight should refresh one. */
export function markTokensCleared(): void {
  generation += 1;
  mintedAt = 0;
}

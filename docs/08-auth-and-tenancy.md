# 08 — Authentication & Tenancy

Two auth personas, two token pairs, one active tenant, and a switch that has to
swap credentials without ever showing the wrong coach's data. This is the most
failure-prone area of the app; the guards described here exist because each of
them was needed.

---

## 1. Two personas, two API surfaces

Everything auth-related forks on `persona`:

| | `persona: 'coach'` | `persona: 'customer'` |
| --- | --- | --- |
| Register | `POST /auth/register` | `POST /auth/customer/register` |
| Login | `POST /auth/login` | `POST /auth/customer/login` |
| Google | `POST /auth/google` | `POST /auth/customer/google` |
| Identity | `GET /auth/me` | `GET /auth/customer/me` |
| Memberships | — (one, synthesised) | `GET /auth/customer/memberships` |
| Refresh | `POST /auth/refresh` | `POST /auth/customer/refresh` |
| Logout | `POST /auth/logout` | `POST /auth/customer/logout` |
| Password reset | `/auth/forgot-password` → `/auth/verify-reset-otp` → `/auth/reset-password` | same paths under `/auth/customer` |
| Profile | `/coaches/me` | `/clients/me` |

The persona is chosen at signup/login by `RoleToggle` on `AuthScreen`, persisted
to SecureStore, and never changes for a session. It is **not** the same thing as
the membership `role` — see
[`01-architecture.md §2`](01-architecture.md#2-persona-vs-role--the-distinction-everything-hangs-on).

---

## 2. What is stored where

### `expo-secure-store` — the only place credentials live

| Key | Written by | Meaning |
| --- | --- | --- |
| `accessToken` | `saveTokens` | Bearer token. **Carries the tenant.** |
| `refreshToken` | `saveTokens` | Single-use; rotated on every refresh |
| `persona` | `saveTokens` | Picks the API surface, including the refresh path |
| `userEmail` | `saveTokens` | Lowercased; keys the per-user onboarding flag |
| `activeTenantId` | login / switch / root layout | Survives relaunch |
| `uply.hasCompletedProfile` | `markProfileComplete` | Device-local setup flag |
| `uply.profile` | `markProfileComplete` | Cached setup answers |
| `uply.hasOnboarded[.email]` | `markOnboarded` | Per-user first-run flag |

### Redux — presence only

```ts
auth = { isAuthenticated, userId, persona, profileCompleted, loading }
```

**No token value ever enters Redux.** A token in the store ends up in devtools,
in logs and in crash reports.

---

## 3. Sign-in flow

```
AuthScreen
  ├─ POST /auth[/customer]/login | /register | /google
  ├─ saveTokens(access, refresh, persona, email)
  ├─ primeActiveTenant(persona)
  │     coach    → lazy GET /auth/me                   → currentTenant.id
  │     customer → lazy GET /auth/customer/memberships → first active membership
  │     → dispatch(setActiveTenant) + SecureStore('activeTenantId')
  ├─ profileLooksComplete(serverProfile, persona)      ← server-side sanity check
  │     true → markProfileComplete()                   ← so a reinstall skips setup
  └─ dispatch(setAuth({ userId, persona, profileCompleted }))
        └─ router.replace(...)
              coach                       → /(coach)/(tabs)/home
              coach, profile incomplete   → /(setup)/coach-profile
              customer, not onboarded     → /(onboarding)/onboarding
              customer, profile incomplete→ /(setup)/client-profile
              customer, no tenant         → /(setup)/match-coach
              customer                    → /(client)/(tabs)/today
```

`primeActiveTenant` uses **lazy** triggers so the tenant is in place before the
first tenant-scoped screen mounts. If it fails, the root layout's
`refetchOnMountOrArgChange: true` is the recovery path — see
[`01-architecture.md §5`](01-architecture.md#5-boot-sequence).

### Password reset is three steps

```
POST /auth[/customer]/forgot-password   { email }        → OTP sent
POST /auth[/customer]/verify-reset-otp  { email, otp }   → returns a reset token
POST /auth[/customer]/reset-password    { …, password }  → done
```

`VerifyResetOtpResponse` carries the token the third call needs. Screens:
`ForgotPasswordScreen` → `VerifyScreen` → `ResetPasswordScreen`.

---

## 4. Session restore

On cold start, `src/app/_layout.tsx` reads `accessToken` + `persona` from
SecureStore and dispatches `setAuth` **without validating the token**. The first
API call does the validating: a 401 triggers a refresh, and only a refresh the
server *refuses* triggers `forceLogout` (§5).

`setLoading(false)` runs in a `finally`, so `auth.loading` cannot stay stuck true
for a signed-out user.

---

## 5. Token refresh

[`src/api/tokenRefresh.ts`](../src/api/tokenRefresh.ts) is the single refresh
implementation, and it **joins concurrent callers**:

```ts
let inFlight: Promise<RefreshOutcome> | null = null;

export function refreshSession(): Promise<RefreshOutcome> {
  if (!inFlight) inFlight = doRefresh().finally(() => { inFlight = null; });
  return inFlight;
}
```

This matters because the refresh token is **single-use**. A 401 from an RTK Query
request and a 401 from an in-flight file upload arriving together would otherwise
each spend it, and the second would fail — logging out a user whose session was
fine. Three call sites share this one promise: `baseApi`, `mediaUpload`, and the
AI socket's auth recovery. (`refreshAccessToken(): Promise<boolean>` still exists
for the two callers that can't act on *why* it failed.)

The refresh path itself is persona-dependent (`/auth/refresh` vs
`/auth/customer/refresh`) and sends the **refresh token in the `Authorization`
header**, not the body.

### The outcome decides whether the session is over

| `RefreshOutcome` | When | Effect |
|---|---|---|
| `refreshed` | new pair saved | retry the request |
| `rejected` | refresh route answered 401/403, or there is no refresh token | `forceLogout()` — **the only path that signs a user out** |
| `unavailable` | offline, timeout, 5xx, unreadable body | keep the session, surface the error |

`unavailable` exists because a dropped connection says nothing about the session.
Collapsing it into "failed" is what logged people out on a flaky network.

### Token generation

[`tokenGeneration.ts`](../src/api/tokenGeneration.ts) counts token pairs;
`saveTokens` bumps it, so login, refresh and the tenant switch all count. The
reauth wrapper reads it to tell a stale token apart from a refused one.

### The reauth wrapper

[`baseApi.ts`](../src/api/baseApi.ts) → `baseQueryWithReauth`, in order:

```
1. capture the tenant epoch, the token generation and the start time
2. run the request
3. epoch changed?      → discard the response (§7)
4. 401 on a non-auth route?
       generation moved while in flight → retry on the new token, no refresh
       token was minted < 15s before the request started → it is the ROUTE
           refusing this token, not an expiry: surface the error, no refresh
       otherwise → refreshSession(), then the outcome table above
5. still 401 after a retry? → surface it. A token minted seconds ago is not
   evidence the session is over.
```

Auth routes are excluded by URL match — a bad password must surface as a 401 to
the login screen, not kick off a refresh.

In `__DEV__`, a surviving 401 logs the rejected token's claims
(`type`/`persona`/`role`/`tenant`/`exp`, decoded by [`jwt.ts`](../src/api/jwt.ts)).
`"Invalid token type"` on `/client/me/*` means a token minted for the other
surface, or one with no tenant — neither of which a refresh can fix.

### `forceLogout`

```ts
if (!state?.auth?.isAuthenticated) return;    // idempotent
clearTokens();
disconnectChatSocket(); disconnectAiSocket(); // both hold the dead token
dispatch(clearAuth()); dispatch(clearChatUi());
dispatch(clearActiveTenant()); dispatch(clearMemberships());
dispatch(baseApi.util.resetApiState());
```

The guard makes a second 401 arriving after logout a no-op.

> **Watch out:** an endpoint that reliably 401s no longer logs the user out, but
> it still burns a refresh on the first hit of every fresh token and leaves the
> screen in an error state. Don't call a route the current token can't satisfy:
> that is why the unimplemented client-invitation routes are gated behind
> `CLIENT_INVITATIONS_READY = false`, and why `useChatRole` refuses to call the
> chat API of the surface the persona wasn't minted for.

### Keeping a client's token tenant-scoped

A customer who registered before joining a coach holds a token with **no tenant
claim**, and every `/client/me/*` route rejects it once memberships arrive and
the screens start reading — a valid session that 401s everywhere.
[`useTenantScopedToken`](../src/shared/hooks/useTenantScopedToken.ts), mounted
once in `src/app/_layout.tsx`, compares the token's tenant claim against the
active tenant and re-scopes through `switch-tenant` (§6) when they disagree —
once per tenant per session, non-blocking, never a logout on failure.

---

## 6. Tenant switching

A client with several coaches switches from `ProfileScreen`. The critical fact:

> **The tenant is encoded in the JWT. Not one documented API route reads
> `x-tenant-id`.** A switch that updates Redux but not the tokens is *cosmetic* —
> the UI says the new coach while every request keeps returning the old one's data.

[`useSwitchCoach`](../src/shared/hooks/useSwitchCoach.ts), in order:

```
 1. setTenantSwitching(true)          ← splash up BEFORE the first network call
 2. POST /auth/customer/switch-tenant { tenantId }
 3. readTokenPair(res)                ← response is untyped: accepts res, res.tokens,
                                         res.data, res.data.tokens, camel or snake
    └─ no pair? THROW. Never leave the session half-switched.
 4. saveTokens(access, refresh, 'customer')
 5. bumpTenantEpoch()                 ← everything still in flight is now stale
 6. setActiveTenant(tenantId) + SecureStore('activeTenantId')
 7. baseApi.util.resetApiState()      ← after the tokens, never before
 8. reconnectChatSocket() / reconnectAiSocket()   ← NOT awaited (see below)
 9. router.dismissAll() + replace('/(client)/(tabs)/today')
10. finally: setTenantSwitching(false)
```

Four deliberate decisions in there:

- **Reset the cache *after* persisting tokens.** The mutation deliberately has no
  `invalidatesTags` — invalidation would refetch with the stale token.
- **Socket reconnects are not awaited.** A socket that hangs or rejects must not be
  able to abort the switch and leave the app with new tokens but a stale cache —
  the failure where data only comes good after a manual app restart.
- **Navigation resets to the tab root.** Pushed screens carry the *old* tenant's
  ids in their route params (`/program/[programId]`, `/workout/[programDayId]`).
  Remounting them just refetches dead ids. Callers that switch as a side effect of
  an action on the current screen pass `{ resetNavigation: false }`.
- **The root `Stack` is keyed by a tenant epoch**, so the whole navigator remounts
  and no screen survives with derived local state.

The assistant thread is wiped by `assistantSlice`'s `setActiveTenant` reducer —
an answer grounded in Coach A's knowledge base must not be on screen under Coach B.

---

## 7. The tenant epoch

[`src/api/tenantEpoch.ts`](../src/api/tenantEpoch.ts) is 18 lines and prevents a
whole class of bug:

```ts
let epoch = 0;
export const currentTenantEpoch = () => epoch;
export const bumpTenantEpoch = () => (epoch += 1);
```

`resetApiState()` clears the cache but **does not abort requests already in
flight**. Those resolve afterwards and RTK Query happily writes them into the
freshly-cleared cache — which is how a newly mounted screen ends up rendering the
*previous* tenant's data.

So every request captures the epoch it started under and compares on the way out:

```ts
const startedUnderEpoch = currentTenantEpoch();
let result = await rawBaseQuery(args, api, extraOptions);
if (currentTenantEpoch() !== startedUnderEpoch) return { error: STALE_TENANT_ERROR };
```

The check runs **before** the 401 branch on purpose: an expired *old-tenant* token
must not log out a user who is now correctly authenticated as the new one.

`STALE_TENANT_ERROR` is a `CUSTOM_ERROR`. Screens treat it as a transient error;
the refetch triggered by the reset supplies the real data moments later.

---

## 8. Sockets and auth

Both singletons pass the token through a **callback**, not a static object:

```ts
auth: (cb) => SecureStore.getItemAsync("accessToken")
                 .then((fresh) => cb({ token: fresh ?? token }))
                 .catch(() => cb({ token })),
```

socket.io re-invokes that callback on every reconnect, so a token refreshed since
connect time is picked up automatically.

Both also carry a **generation counter**, for the same reason as the tenant epoch:
a `connect()` started before a logout/switch must not install itself as the
singleton after one. `disconnect*Socket()` bumps the generation; the async
constructor checks it before assigning.

Auth recovery differs by gateway:

| | Chat (`/chat`) | AI (default namespace) |
| --- | --- | --- |
| Signal | `error` / `connect_error` matching `/unauthor\|token\|401\|403/i` | an explicit `ai.unauthorized` frame |
| Recovery | exponential backoff (1s, 2s, 4s) then reconnect | `refreshAccessToken()` then `socket.connect()` |
| Retries | 3, then give up quietly | 3, then give up quietly |

"Give up quietly" is correct in both cases: REST still works, and its 401 handling
will drive a real logout if the session is genuinely dead.

---

## 9. Account deletion

`DeleteAccountSheet` in `shared/profile` calls `DELETE /coaches/me` or
`DELETE /clients/me`, then runs the same teardown as logout.

---

## 10. Rules

1. Tokens live in `expo-secure-store`. Never Redux, never AsyncStorage, never a log.
2. Refresh only through `refreshAccessToken()` — never inline a refresh call.
3. A tenant switch **must** persist new tokens. If the response has no token pair,
   throw; do not proceed.
4. Any new transport that holds a token must be disconnected in `forceLogout` and
   reconnected in `useSwitchCoach`.
5. Never gate a UI on `auth.persona` when you mean the membership `role`.
6. Never add an endpoint that 401s by design — it will log users out.
7. Anything derived from the tenant (cache entries, socket rooms, in-memory
   threads) must be reset on `setActiveTenant`.

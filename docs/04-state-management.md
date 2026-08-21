# 04 — State Management

Redux Toolkit for client state, RTK Query for **all** server state. This is where
"per-tenant, not global" stops being a principle and becomes code.

Read [`01-architecture.md`](01-architecture.md) first.

---

## 1. The store

[`src/store/index.ts`](../src/store/index.ts):

```
store
├── auth          slice   isAuthenticated · userId · persona · profileCompleted · loading
├── activeTenant  slice   tenantId · switching
├── memberships   slice   entity adapter, keyed by tenantId
├── chatUi        slice   connected · typingByClientId · openClientId
├── assistant     slice   thread · busy · connected · lastPrompt
└── api           RTK Query — every server response and its cache
```

The split to internalise: **client state** (small, local, synchronous) lives in
slices; **server state** lives in the one `baseApi`. Never copy server data into a
slice — read it from the query hook where you need it.

```ts
serializableCheck: false        // FormData bodies and Date objects flow through mutations
```

### App-focus refetching

RTK Query's `setupListeners` binds to DOM `window` focus events, which do not
exist in React Native. The store rewires it to `AppState`:

```ts
setupListeners(store.dispatch, (dispatch, actions) => {
  const sub = AppState.addEventListener('change', (s) =>
    dispatch(s === 'active' ? actions.onFocus() : actions.onFocusLost()));
  return () => sub.remove();
});
```

This only **publishes the signal**. Nothing refetches unless an endpoint opts in
with `refetchOnFocus` at its call site — so reopening the app is not an app-wide
refetch storm.

### Typed hooks

```ts
import { useAppDispatch, useAppSelector } from '@/store';
```

Always these two, never the untyped `useDispatch` / `useSelector`.

---

## 2. `auth` — presence, not credentials

```ts
interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  persona: 'coach' | 'customer' | null;
  profileCompleted: boolean;
  loading: boolean;          // true until restoreSession() finishes
}
```

**Tokens are not in here and must never be.** The slice module also exports the
two SecureStore helpers, which is the only sanctioned way to touch credentials:

```ts
saveTokens(accessToken, refreshToken, persona, email?)   // + userEmail, lowercased
clearTokens()                                            // wipes all four keys
```

`loading` starts `true` and is cleared in `restoreSession`'s `finally` — including
when there was no session, so a signed-out user never gets stuck on a spinner.

> `userId` is set to the literal `'restored-user'` on session restore. Nothing
> reads it for identity; the real user comes from `/auth/me` or
> `/auth/customer/me`. Don't start depending on it.

---

## 3. `activeTenant` — one tenant in focus

```ts
interface ActiveTenantState {
  tenantId: string | null;
  switching: boolean;   // splash is held for the whole swap
}
```

`switching` exists so no screen is ever painted half-switched: `useSwitchCoach`
raises it *before* the first network call and lowers it in a `finally`, and the
root layout renders `AnimatedSplash` over everything while it is true.

`setActiveTenant` is also the **reset signal for the assistant** — see §6.

---

## 4. `memberships` — normalised by `tenantId`

[`membershipsSlice.ts`](../src/store/membershipsSlice.ts) uses
`createEntityAdapter`, with the entity `id` set to the `tenantId`:

```ts
function normalizeMembership(m: any): ReduxMembership {
  const tenantId = m?.tenantId || m?.tenant?.id || m?.id || '';
  return {
    ...m,
    tenantId,
    tenantName: m?.tenantName || m?.tenant?.name || 'Coaching',
    role:   m?.role   || 'client',
    status: m?.status || 'active',
    id: tenantId,                     // the adapter key
  };
}
```

The defensive key-walking is not paranoia: `GET /auth/customer/memberships` and
the synthesised coach membership do not agree on shape, and rows without a
resolvable `tenantId` are **dropped** rather than stored under `''`.

Two sources write here, both from the root layout:

- **coach** → one synthesised membership: `{ tenantId: coachMe.currentTenant.id,
  role: 'owner', status: 'active' }`
- **customer** → the array from `/auth/customer/memberships`, verbatim

### Reading role and status

```ts
// src/shared/hooks/useActiveTenant.ts
const tenantId   = useAppSelector((s) => s.activeTenant.tenantId);
const membership = useAppSelector((s) =>
  tenantId ? membershipsSelectors.selectById(s.memberships, tenantId) : undefined);

return { tenantId, membership, role: membership?.role ?? null,
                               status: membership?.status ?? null };
```

`useRole()` builds `isCoach` / `isClient` on top. **Every role check in the UI goes
through the active membership — never a global field, never `auth.persona`.**

---

## 5. `chatUi` — transient chat state

```ts
{ connected, typingByClientId: Record<string, boolean>, openClientId: string | null }
```

Nothing here is persisted or fetched. `openClientId` is what stops the unread
badge from incrementing for a thread the user is already looking at
(`CLIENT_THREAD = 'me'` is the client's single thread). Losing the connection
clears every typing flag, so an indicator can't hang.

---

## 6. `assistant` — an in-memory thread, deliberately

```ts
{ thread: AiMessage[], busy: boolean, connected: boolean, lastPrompt: string | null }
```

It lives in Redux rather than screen state for two reasons: the thread survives a
tab change (the AI screen unmounts while an answer is outstanding), and tenant
isolation becomes one reducer instead of per-screen cleanup:

```ts
extraReducers: (b) => b
  .addCase(setActiveTenant, () => initialState)
  .addCase(clearActiveTenant, () => initialState),
```

**Never persist this.** An answer grounded in Coach A's knowledge base must not be
reachable after switching to Coach B.

The reducers encode the protocol's correlation rules — `attachRequestId` finds the
newest pending bubble rather than trusting a caller-supplied id, `failIfPending`
refuses to overwrite a bubble that already resolved. Full protocol in
[`06-Ai-Integration.md`](06-Ai-Integration.md).

---

## 7. RTK Query: one API, endpoints injected per domain

[`src/api/baseApi.ts`](../src/api/baseApi.ts) declares the api, the tag types and
the base query. Every domain module then does:

```ts
export const clientsEndpoints = baseApi.injectEndpoints({ endpoints: (b) => ({ … }) });
export const { useGetClientsQuery } = clientsEndpoints;
```

23 modules live in `src/api/endpoints/`. There is exactly one `createApi` call in
the codebase — see [`09-data-layer.md`](09-data-layer.md) for the full catalogue.

### `prepareHeaders`

```ts
const token = await SecureStore.getItemAsync('accessToken');
if (token) headers.set('authorization', `Bearer ${token}`);
const tenantId = state.activeTenant.tenantId;
if (tenantId) headers.set('x-tenant-id', tenantId);
```

> **The header is belt-and-braces, not the mechanism.** The server resolves the
> tenant from the JWT. That is why a tenant switch must persist re-scoped tokens
> — see [`08-auth-and-tenancy.md`](08-auth-and-tenancy.md).

---

## 8. `tenantId` in query args is a cache key

Nearly every endpoint takes `tenantId` in its args and then **throws it away**
before building the request:

```ts
listPrograms: builder.query<any[], ListProgramsQuery & { tenantId: string }>({
  query: ({ tenantId, ...params }) => ({ url: P, params }),   // tenantId not sent
  providesTags: (r, e, { tenantId }) => [
    'Programs',
    { type: 'Programs', id: `LIST-${tenantId}` },
  ],
}),
```

Why bother:

- RTK Query keys a cache entry by its serialised args, so `tenantId` gives **two
  tenants two independent caches**.
- It makes tags tenant-specific, so an invalidation can't reach across tenants.
- The plain `'Programs'` tag is kept alongside because mutations often only know a
  `programId` and still need to invalidate the lists.

**Rule: if an endpoint returns tenant-scoped data, it takes `tenantId` in its
args.** No exceptions — even when the URL already identifies the resource.

---

## 9. The tag catalogue

Declared in `baseApi.tagTypes`:

| Tag | Provided by | Invalidated by |
| --- | --- | --- |
| `Me` | `/auth/me`, `/coaches/me`, `/clients/me` | profile + media mutations |
| `Tenant` | `/tenant/me`, `/tenant/{id}` | tenant create, logo update |
| `Memberships` | `/auth/customer/memberships` | tenant create, onboarding confirm |
| `Clients` | `/client`, `/client/{id}` | remove client, approve join request |
| `Intake` | `/client/me/intake` | intake writes |
| `Invitations` | `/invitation`, `/client/me/invitations` | create/revoke/decline |
| `JoinRequests` | both sides | create/withdraw/approve/reject |
| `Directory` · `CoachProfile` | directory + public profile | **review writes** |
| `Reviews` | `/reviews/me`, client's own review | review writes |
| `Measurements` | client history, coach reads, pending queue | create/update/delete/review |
| `Exercises` · `Foods` · `Meals` | the per-tenant libraries | library CRUD |
| `Programs` · `Program` | coach + client program reads | program lifecycle, workout completion |
| `Calendar` · `TrainingDay` · `WorkoutLog` | client training | set logging, skip, complete |
| `NutritionPlans` · `NutritionPlan` · `NutritionCalendar` · `NutritionDay` · `NutritionLog` | nutrition | meal outcomes, food logs, complete |
| `Activity` | `/client/me/activity` heat-map | **set/meal outcome mutations**, not completion |
| `Analytics` | every `/analytics/*` route | program create/publish/reschedule/cancel |
| `Conversations` · `Messages` | chat REST | patched directly by socket handlers |

### Two tag conventions worth copying

**`CoachProfile` is separate from `Reviews` on purpose.** A client's own review is
a member of the public aggregate, so writing it must refresh the *public* numbers
(directory row, public profile, rating summary) — not just the client's own copy.

**`Activity` is invalidated by outcomes, not completions.** The heat-map moves when
a set or meal outcome is recorded, which can happen while a workout is still
`in_progress`. `/complete` invalidates it too, but only as a cheap safety net for
activity recorded on another device.

---

## 10. Cache-key patterns in use

| Pattern | Meaning |
| --- | --- |
| `{ type: 'X', id: \`LIST-${tenantId}\` }` | the tenant's collection |
| `{ type: 'X', id: \`${tenantId}:${entityId}\` }` | one entity, tenant-namespaced |
| `{ type: 'Measurements', id: \`PENDING-${tenantId}\` }` | the coach's review queue |
| `{ type: 'Measurements', id: \`CLIENT-${tenantId}:${clientId}\` }` | one client's history, coach-side |
| `{ type: 'Invitations', id: 'MINE' }` | the client's own feed — spans tenants, so **not** tenant-keyed |
| `{ type: 'Analytics', id: \`OVERVIEW-${tenantId}-${from}-${to}\` }` | windowed analytics |
| `{ type: 'Analytics', id: \`LIST-${tenantId}\` }` | the blast-radius tag every analytics query also provides |

`'MINE'` is the exception that proves the rule: `/client/me/invitations` and
`/client/me/join-requests` answer across **all** of the client's tenants, so
keying them by the active tenant would be wrong.

---

## 11. Cache lifetimes

Analytics is derived data that moves whenever any client logs anything, so those
endpoints set explicit `keepUnusedDataFor`:

| Endpoint | Seconds | Why |
| --- | --- | --- |
| `getAnalyticsActivity` | 30 | the most volatile feed |
| `overview` · `attention` · `roster` · `adherence` · `clientProgress` | 60 | dashboard reads |
| `programEffectiveness` · `templateSurvival` | 300 | whole-history aggregates, not windowed |

Everything else uses the RTK Query default (60s).

---

## 12. Optimistic updates

Two places do real optimistic work, and they use different tools.

### `onQueryStarted` + `updateQueryData` — review ratings

[`reviews.endpoints.ts`](../src/api/endpoints/reviews.endpoints.ts) folds a rating
in or out of the public aggregate so the header flips from `—` to `5.0 · 1 review`
on the tap, then lets the tag invalidation reconcile:

```ts
async onQueryStarted({ body, tenantId }, { dispatch, queryFulfilled }) {
  const patch = dispatch(reviewsEndpoints.util.updateQueryData(
    'getPublicReviewsSummary', { tenantId },
    (draft) => foldRating(draft, { next: body.rating, delta: 1 }) ?? draft));
  try { await queryFulfilled; } catch { patch.undo(); }
}
```

`foldRating` returns `null` when the summary can't be reasoned about, and the
caller then **leaves the cache alone and waits for the refetch rather than
inventing a number**. Removing the last review yields an `undefined` average, never
`0.0` — a zero would render as a catastrophic score for a coach with no reviews.

### Direct cache patchers — chat

Messaging doesn't use `onQueryStarted` at all. Socket events and optimistic sends
both go through named helpers in
[`messaging/cache.ts`](../src/features/shared/messaging/cache.ts):
`upsertMessage`, `removePendingMessage`, `setPendingStatus`, `markOutboundRead`,
`markInboundRead`, `bumpConversation`, `clearConversationUnread`. Full design in
[`10-chat-messaging.md`](10-chat-messaging.md).

---

## 13. Custom `serializeQueryArgs` — the chat threads

Chat needs **one cache entry per thread**, with `before` / `limit` paging *into* it
rather than spawning new entries:

```ts
serializeQueryArgs: ({ endpointName, queryArgs }) =>
  `${endpointName}(${queryArgs.tenantId}:${queryArgs.clientId})`,
merge: (cache, incoming) => mergeMessages(cache, incoming),
forceRefetch: ({ currentArg, previousArg }) =>
  Boolean(currentArg?.before) && currentArg?.before !== previousArg?.before,
```

That combination gives the socket a single place to patch. `forceRefetch` is
required because with a collapsed cache key RTK Query would otherwise consider a
new `before` value the same query and never fetch the older page.

---

## 14. Resetting

Three different resets, and they are not interchangeable:

| Situation | What runs |
| --- | --- |
| **Logout / forced 401** | `forceLogout()` in `baseApi.ts`: `clearTokens()` → disconnect both sockets → `clearAuth` + `clearChatUi` + `clearActiveTenant` + `clearMemberships` → `resetApiState()` |
| **Tenant switch** | `useSwitchCoach`: persist new tokens → `bumpTenantEpoch()` → `setActiveTenant` → `resetApiState()` → reconnect both sockets → `router.replace` to the tab root |
| **Single resource** | `invalidatesTags` on the mutation |

`forceLogout` is guarded on `state.auth.isAuthenticated` so a 401 arriving after
an already-completed logout can't fire the whole teardown a second time.

---

## 15. Performance notes

- Select the narrowest slice you need. `useAppSelector((s) => s.chatUi.connected)`
  re-renders on far less than selecting `s.chatUi`.
- Co-locate selectors with slices; memoise cross-slice derivations with
  `createSelector`.
- React Compiler is on — reach for `useMemo`/`useCallback` when **identity** feeds a
  dependency array or a query arg, not as blanket optimisation.
- For a screen assembled from many reads, write **one hook** that owns all of them
  and returns a single `isLoading` / `isFetching` / `refetchAll`
  (`useCoachHomeData`, `useTodayData`). Subscribing to the same query from a child
  costs nothing extra — RTK Query dedupes — so children can keep their own hooks
  while the parent controls the loading gate.

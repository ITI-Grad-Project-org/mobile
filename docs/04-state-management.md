# 04 — State Management (Redux Toolkit + RTK Query)

This is where the "per-tenant, not global" rule becomes concrete code. Read [doc 01](01-architecture.md) first.

## Store shape

```
store
├── auth            (slice)    token presence, current userId  [client state]
├── activeTenant    (slice)    the tenantId currently in focus  [client state]
├── memberships     (slice)    0..N memberships, normalized by tenantId  [client state]
├── ui              (slice)    prefs, theme, transient flags  [client state]
└── api             (RTK Query) ALL server data + cache  [server state]
```

The split to internalize: **client state** (small, local, synchronous) lives in slices; **server state** (everything fetched) lives in **one RTK Query `api`**. Don't duplicate server data into slices — read it from RTK Query hooks where you need it.

## Memberships: normalized by `tenantId`

The spec is explicit: memberships are normalized by `tenantId`. Use `createEntityAdapter`.

```ts
// src/features/memberships/membershipsSlice.ts
import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

export type Role = 'owner' | 'client';   // coach (owner) or trainee (client) — no assistant role
export type MembershipStatus = 'invited' | 'active' | 'paused' | 'removed';

export interface Membership {
  tenantId: string;          // <-- the entity id
  tenantName: string;
  role: Role;
  status: MembershipStatus;
  brand?: { logoUrl?: string; primaryColor?: string };
}

const adapter = createEntityAdapter<Membership>({
  selectId: (m) => m.tenantId,         // keyed by tenantId, per spec
});

const slice = createSlice({
  name: 'memberships',
  initialState: adapter.getInitialState(),
  reducers: {
    setMemberships: adapter.setAll,
    upsertMembership: adapter.upsertOne,
    removeMembership: adapter.removeOne,
  },
});

export const { setMemberships, upsertMembership, removeMembership } = slice.actions;
export const membershipsSelectors = adapter.getSelectors();
export default slice.reducer;
```

Now "what role am I in tenant X?" is a direct lookup, and a user with multiple coaches is modeled natively — no global role field anywhere.

## Active tenant

```ts
// src/features/../activeTenantSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ActiveTenantState { tenantId: string | null; }
const initialState: ActiveTenantState = { tenantId: null };

const slice = createSlice({
  name: 'activeTenant',
  initialState,
  reducers: {
    setActiveTenant: (s, a: PayloadAction<string>) => { s.tenantId = a.value ?? a.payload; },
    clearActiveTenant: (s) => { s.tenantId = null; },
  },
});
export const { setActiveTenant, clearActiveTenant } = slice.actions;
export default slice.reducer;
```

Auto-select when there's exactly one membership; otherwise the user picks on the tenant-switcher screen.

### The `useActiveTenant` hook

```ts
// src/shared/hooks/useActiveTenant.ts
export function useActiveTenant() {
  const tenantId = useAppSelector((s) => s.activeTenant.tenantId);
  const membership = useAppSelector((s) =>
    tenantId ? membershipsSelectors.selectById(s.memberships, tenantId) : undefined
  );
  return {
    tenantId,
    membership,
    role: membership?.role,
    status: membership?.status,
  };
}
```

`useRole()` and `useFeatureGate()` build on this. **All role/permission checks in the UI go through the active membership — never a global field.**

## RTK Query: tenant-scoped from the base query

Every server call is implicitly scoped to the active tenant. Two parts make this clean: inject the tenant header in the base query, and tag cache entries by tenant.

```ts
// src/store/api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import type { RootState } from './index';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.EXPO_PUBLIC_API_URL,
    prepareHeaders: async (headers, { getState }) => {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) headers.set('authorization', `Bearer ${token}`);
      // Scope EVERY request to the active tenant:
      const tenantId = (getState() as RootState).activeTenant.tenantId;
      if (tenantId) headers.set('x-tenant-id', tenantId);
      return headers;
    },
  }),
  tagTypes: ['Client', 'Program', 'CheckIn', 'Message', 'Membership', 'KB', 'Analytics'],
  endpoints: () => ({}),   // features inject their own
});
```

Each feature injects endpoints and tags them by tenant so switching tenants invalidates cleanly:

```ts
// src/features/clients/api.ts
import { api } from '../../store/api';

export const clientsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getClients: build.query<Client[], { tenantId: string }>({
      query: ({ tenantId }) => `clients`,  // header already carries tenantId
      providesTags: (result, _e, { tenantId }) => [
        { type: 'Client', id: `LIST-${tenantId}` },
        ...(result ?? []).map((c) => ({ type: 'Client' as const, id: `${tenantId}:${c.id}` })),
      ],
    }),
    // ...invite, archive, notes, etc.
  }),
});

export const { useGetClientsQuery } = clientsApi;
```

**Why tag by `tenantId`:** when the user switches from Coach A to Coach B, you invalidate `LIST-A`-tagged data so the UI doesn't briefly show the wrong tenant's clients. It also means a client viewing two coaches keeps two independent caches.

> Pass `tenantId` explicitly as a query arg even though the header carries it. The arg makes the cache key tenant-specific so RTK Query stores per-tenant results separately. The header is what the server actually reads.

## Switching tenants safely

When `setActiveTenant` fires:

1. Update the slice.
2. Optionally `dispatch(api.util.invalidateTags([...]))` for the tenant-scoped tags, or rely on the fact that the new `tenantId` arg produces different cache keys and triggers fresh fetches.
3. Reset any in-progress AI job tickets tied to the old tenant (see [doc 06](06-ai-assistant-integration.md)).

## Optimistic updates (where they matter)

Two flows benefit:

- **Workout logging** — user logs a set; update the cache immediately, reconcile on response, roll back on failure. Critical for gym UX where the network is flaky.
- **Messaging** — show the sent message instantly with a "sending" state.

Use RTK Query's `onQueryStarted` + `updateQueryData` for both. Keep optimistic patches tenant-scoped (they will be automatically, since cache keys include `tenantId`).

## Auth state

- Token **presence** and `userId` live in the `auth` slice (for routing decisions).
- The token **value** lives in `expo-secure-store`, read in `prepareHeaders`. Never put the raw token in Redux state (it ends up in logs, devtools, and crash reports).
- On sign-out: clear SecureStore, reset the slice, and `dispatch(api.util.resetApiState())` to wipe all cached tenant data.

## Selectors & performance

- Co-locate selectors with slices; memoize cross-slice derivations with `createSelector`.
- For long lists (rosters, threads, exercise library) feed RTK Query results into **FlashList v2**.
- Avoid selecting whole entities when you need one field — it causes needless re-renders.
# 01 — Architecture

> **Route location note:** this doc shows routes under a top-level `app/` for readability.
> In this repo the Expo Router root is **`src/app/`** (`main: expo-router/entry`,
> `tsconfig` alias `@/* → ./src/*`). Read every `app/...` path below as `src/app/...`.

## The mental model

CoachHub is multi-tenant. A **tenant** is a coaching business. One human account can belong to **zero or many** tenants, and can hold a different role in each (`owner`, `assistant`, `client`). The mobile app must therefore always answer two questions before rendering anything substantial:

1. **Who is this user?** (global identity — one login)
2. **Which tenant are they acting in right now, and what is their role there?** (membership — a join, not a property of the user)

This is the most important architectural fact in the whole app, and it comes straight from the spec (ADR D9). Everything below follows from it.

### Why "per-tenant, not global" changes your code

A naive mobile app stores `currentUser.role` and `currentUser.programs`. **You cannot do that here.** A client of Coach A and Coach B has two memberships, two program sets, two message threads, two AI knowledge bases — all under one login. So:

- There is no global `role`. There is a **role per active membership**.
- There is no global "my program". There is "my program **in tenant X**".
- The lifecycle state machine (`invited → active → paused → removed`) runs **once per membership**, not once per user.

Practically, the app has an **active-tenant context**: a `tenantId` that the user selects (or that's auto-selected if they only have one membership). Almost every screen and every server call is parameterized by that `tenantId`.

## App layers

```
┌─────────────────────────────────────────────┐
│  UI layer                                     │
│  - @expo/ui (native SwiftUI / Compose)        │
│  - RN primitives + NativeWind (custom/brand)  │
│  - Expo Router screens                         │
├─────────────────────────────────────────────┤
│  Feature modules (CRM, programming, ...)      │
│  each = components + hooks + RTK Query slice  │
├─────────────────────────────────────────────┤
│  State layer                                   │
│  - Redux Toolkit store                         │
│  - RTK Query (all server I/O + cache)          │
│  - active-tenant context                       │
├─────────────────────────────────────────────┤
│  Platform / services                           │
│  - auth (token storage in SecureStore)         │
│  - notifications (in-app; push is v2)          │
│  - file/image upload (progress photos, KB)     │
└─────────────────────────────────────────────┘
```

## Folder structure

A feature-first layout. Each feature owns its screens, components, hooks, and RTK Query endpoints. Shared/cross-cutting code lives in `src/shared` and `src/store`.

```
src/app/                      # Expo Router routes ONLY (thin screens)
  (auth)/
    sign-in.tsx
    accept-invite.tsx
  (app)/
    _layout.tsx               # tenant guard lives here
    index.tsx                 # tenant switcher / dashboard entry
    clients/
    programs/
    check-ins/
    messages/
    assistant/
    settings/                 # owner-only group
  _layout.tsx                 # root: providers, store, theme

src/
  store/
    index.ts                  # configureStore
    api.ts                    # base RTK Query api (baseQuery, tenant header)
    activeTenantSlice.ts      # which tenant is active
    authSlice.ts
  features/
    auth/
    memberships/              # the 0..N memberships, normalized by tenantId
    clients/                  # CRM
      api.ts                  # injectEndpoints
      components/
      hooks/
      screens/
    programs/
    checkins/
    messaging/
    assistant/                # AI job-ticket logic
    analytics/
    billing/                  # plan/tier model + feature gating (concept only in v1)
    tenant-admin/             # branding, team, settings (owner-only)
  shared/
    ui/                       # wrapped @expo/ui components + NativeWind primitives
    components/               # app-wide reusable (Avatar, EmptyState, ...)
    hooks/                    # useActiveTenant, useRole, useFeatureGate
    lib/                      # formatters, validators, constants
    theme/                    # NativeWind config bridge, brand tokens
  types/                      # shared TS types (Membership, Tenant, Role, ...)

AGENTS.md                     # AI agent instructions (see doc 08)
CLAUDE.md                     # -> points at AGENTS.md
```

**Rule:** files in `src/app/` are thin. They import a screen from `src/features/*/screens` and render it. No business logic in the router layer — this keeps routes swappable and keeps the Expo Router fork (SDK 56 changed routing internals) from leaking into your features.

## Navigation

Use **Expo Router** (file-based). SDK 56 forked the navigation primitives away from React Navigation, so:

- Import navigation helpers from `expo-router`, **not** from `@react-navigation/*`. Direct `@react-navigation/*` imports break in SDK 56 Expo Router projects, and `expo-doctor` will warn if both are installed.
- Route groups: `(auth)` for the unauthenticated flow, `(app)` for the authenticated app.
- The **tenant guard** lives in `src/app/(app)/_layout.tsx`: if there's no active tenant and the user has memberships, send them to the tenant switcher; if they have zero memberships, send them to the "thin" unaffiliated experience (accept invite / create tenant — see spec §4).

### Role-based navigation

The **owner-only** group (`settings/` — branding, team management, billing) must be gated by role *in the active tenant*. A `useRole()` hook reads the active membership's role and screens redirect if the role isn't `owner`. **This is UX, not security** — the server still enforces RBAC on every request (see doc 05).

## The lifecycle state machine (per membership)

```
invited ──accept──▶ active ──pause──▶ paused ──resume──▶ active
   │                   │                                    │
   └──decline──▶ (gone)└────────────remove────────────▶ removed
```

This runs **per `tenant_membership`**. The mobile app reads `status` off the active membership and:

- `invited`: show the accept/decline invite screen.
- `active`: full experience for that role.
- `paused`: read-only-ish; surface a "paused by your coach" state.
- `removed`: the membership disappears from the user's list.

Because this is per-tenant, the same user can be `active` in Coach A's tenant and `paused` in Coach B's at the same time. The store models this directly — see [doc 04](04-state-management.md).

## Offline & sync posture (v1)

Keep it pragmatic for v1:

- RTK Query handles caching and refetch. Treat the server as source of truth.
- Workout logging is the one flow where users may be offline (in a gym basement). For v1, queue log submissions optimistically and retry; don't build a full offline-first sync engine (that's scope creep). Document this boundary clearly so you and your teammate don't over-build.

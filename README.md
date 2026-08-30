<div align="center">

# UPLY Mobile

**One React Native app that renders two products.**

UPLY is the mobile client for a multi-tenant fitness-coaching SaaS. Coaches run their
business in it; their clients train through it. Which interface you get is not a
property of your account — it is decided by your **role in the tenant you are currently
in**. The same login can be a coach in one gym and a client of another.

[![Expo SDK](https://img.shields.io/badge/Expo_SDK-56-000020?logo=expo&logoColor=white)](https://docs.expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.85-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![React](https://img.shields.io/badge/React-19.2-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0_strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Platforms](https://img.shields.io/badge/platforms-iOS_·_Android-lightgrey)](#)
[![Dev build](https://img.shields.io/badge/build-dev_client_(not_Expo_Go)-red)](#this-is-a-development-build)

</div>

---

## Contents

[Overview](#overview) · [What the app does](#what-the-app-does) · [Quick start](#quick-start) ·
[Environment](#environment) · [Commands](#commands) · [Architecture](#architecture) ·
[Project layout](#project-layout) · [Feature modules](#feature-modules) ·
[Data layer](#the-data-layer) · [Real-time](#real-time-subsystems) ·
[Design system](#design-system) · [Invariants](#the-invariants) ·
[Docs](#documentation-map) · [Contributing](#contributing)

---

## Overview

| | |
| --- | --- |
| **Repository** | [`ITI-Grad-Project-org/mobile`](https://github.com/ITI-Grad-Project-org/mobile) |
| **Docs** | [`docs/Readme.md`](docs/Readme.md) — the index; start there |
| **Agent rules** | [`AGENTS.md`](AGENTS.md) (also loaded as `CLAUDE.md`) |
| **Size** | ~44,300 lines of TS/TSX across 396 files |
| **Backend** | `3Keys API` — a separate service. Its contract is mirrored in [`docs/07-Uply-endpoints.md`](docs/07-Uply-endpoints.md) |
| **Tests** | None. The gate is `typecheck` + `lint` + running on both platforms |

```
Expo SDK 56  ·  React Native 0.85  ·  React 19.2 (React Compiler ON)  ·  TypeScript 6 (strict)
Expo Router (file-based, typedRoutes)  ·  Redux Toolkit + RTK Query  ·  NativeWind v5 / Tailwind v4
@expo/ui (SwiftUI / Jetpack Compose)  ·  socket.io v4 (chat + AI)  ·  expo-secure-store
```

> ### This is a development build
> **Not Expo Go.** `@expo/ui` native controls, `NativeTabs`, `expo-secure-store`,
> `expo-glass-effect`, Google Sign-In and the socket transports all require the custom
> dev client. Opening this project in Expo Go fails immediately, and no code in this
> repo may assume it.

---

## What the app does

### Coach UI — `role = owner`

Five native tabs, plus screens pushed from Home and the header avatar.

| Tab | Feature | What it is |
| --- | --- | --- |
| **Home** | `coach/home` | Analytics dashboard: roster stats, "needs you now" queues, week activity, insights |
| **Clients** | `coach/clients` | Roster, per-client analytics sheet, invitations, join requests |
| **AI** | `coach/assistant` | Async AI assistant, optionally scoped to one client |
| **Plans** | `coach/plans` | Training programs + nutrition plans, day by day — read, publish, reschedule |
| **Inbox** | `coach/inbox` | Every client conversation, live over the `/chat` socket (with an unread badge) |

**Pushed:** activity feed · renewals · at-risk clients · check-in reviews
(`/check-ins`, `/check-ins/[clientId]`) · coach reviews · billing · notifications ·
plan detail (`/plans/training/[programId]`, `/plans/nutrition/[planId]`) ·
a conversation (`/chat/[id]`) · profile.

### Client UI — `role = client`

| Tab | Feature | What it is |
| --- | --- | --- |
| **Today** | `client/today` | Today's workout, nutrition cards, streak heat-map, check-in prompt |
| **Plan** | `client/plan` | The assigned program and nutrition plan, week by week |
| **AI** | `client/assistant` | The same assistant, grounded in their coach's knowledge base — **hidden until they join a coach** |
| **Progress** | `client/progress` | Measurements, progress photos, weight chart |
| **Chat** | `client/chat` | The single thread with their coach |

**Pushed:** workout logging (`/workout/[programDayId]`) · nutrition logging
(`/nutrition/[dayId]`) · program and plan detail · measurement form ·
a coach's public profile (`/coach/[tenantId]`) · notifications · profile.

### Shared surfaces

Auth (login, register, verify, forgot/reset password) · onboarding carousel ·
profile setup and intake · coach matching · `/my-profile` — **one** screen for both
personas, reached from the header avatar. Profile is deliberately **not** a tab.

### Scope

**Built:** training, nutrition, measurements and check-ins, reviews, chat, the AI
assistant, the coach directory and join requests, analytics, and the coach's own
CoachHub subscription (Free / Solo / Studio via Paymob).

**Not built:** push and SMS, scheduling, agentic AI, a marketplace, and
coach-to-client payments. Plan **authoring** lives in the web dashboard — the app
reads plans and links out to `EXPO_PUBLIC_DASHBOARD_URL`. Billing V1 has no recurring
charge, cancellation, refund, invoice or proration.

---

## Quick start

**Prerequisites:** Node LTS + npm · Xcode with an iOS 17+ simulator · Android Studio
with an emulator · `npm i -g eas-cli` (cloud builds only) · Watchman (optional, macOS).

```bash
git clone https://github.com/ITI-Grad-Project-org/mobile.git UPLY-App
cd UPLY-App
npm install
cp .env.example .env          # then fill it in — see Environment below
npx expo prebuild             # generates ios/ and android/ — both are gitignored
npx expo run:ios              # or: npx expo run:android
```

`expo run:*` compiles the native project **and** installs the dev client. You only
need it on the first run and after a native change. After that, day-to-day work is:

```bash
npx expo start --dev-client   # i → iOS · a → Android · r → reload · --clear → reset Metro
```

Full setup, dev-build/EAS details and troubleshooting live in
[`docs/12-getting-started.md`](docs/12-getting-started.md).

### Signing in during development

The login screen has a persona toggle:

- **Coach** (`persona: 'coach'`) → one tenant, `role: 'owner'` → Coach UI
- **Client** (`persona: 'customer'`) → 0..N memberships → Client UI

A freshly-registered client has **no tenant**. That is a normal state, not a bug —
they land on `/(setup)/match-coach`, and the client AI tab stays hidden until a
membership exists. To exercise the tenant switcher you need a client with **two**
accepted memberships.

---

## Environment

`.env` is gitignored. `EXPO_PUBLIC_*` values are **inlined at bundle time** — none are
secret, and changing one requires a Metro restart.

| Variable | Read by | Purpose / if unset |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | [`src/api/config.ts`](src/api/config.ts) | REST **and** both socket.io gateways. Falls back to a hardcoded nip.io host — **set it** |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `useGoogleAuth` | Google Sign-In (Android / server). Unset → the native call fails |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | `useGoogleAuth` | Google Sign-In (iOS) |
| `EXPO_PUBLIC_DASHBOARD_URL` | [`src/api/config.ts`](src/api/config.ts) | Web dashboard for plan authoring. Empty → every link to it hides |
| `EXPO_PUBLIC_HOME_FIXTURES` | `useCoachHomeAnalytics` | Dev only, `__DEV__`-guarded: `all` \| `clear` \| `nulls` |

The iOS Google URL scheme is **not** an env var — it lives in [`app.json`](app.json)
under the `@react-native-google-signin/google-signin` plugin, and changing it needs a
prebuild + rebuild.

> **Pointing at a local backend:** `localhost` does not resolve from a device or an
> Android emulator. Use your LAN IP (`http://192.168.x.x:PORT`) or a tunnel. Both
> socket gateways derive from the same `BASE_URL`, so one change covers everything.

---

## Commands

| Command | Description |
| --- | --- |
| `npx expo start --dev-client` | Start Metro against the dev build |
| `npm run ios` / `npm run android` | Build and run natively (`expo run:*`) |
| `npm run typecheck` | `tsc --noEmit` — **must** be clean before a PR |
| `npm run lint` | `eslint-config-expo` — **must** be clean before a PR |
| `npx expo-doctor` | Verify dependency versions agree — after any dependency change |
| `npx expo install --fix` | Snap dependencies to the SDK's expected versions |
| `npx expo start --clear` | Reset the Metro + Tailwind cache |
| `npx expo prebuild --clean` | Regenerate `ios/` and `android/` from scratch |

**EAS profiles** ([`eas.json`](eas.json)) — `appVersionSource: "remote"`, so EAS owns
the build number; never bump it by hand:

```bash
eas build --profile development --platform ios      # dev client, internal
eas build --profile preview     --platform android  # release APK, internal
eas build --profile production  --platform all      # store build, autoIncrement
```

---

## Architecture

### One app, two products

```
                        ┌──────────────────────────┐
                        │   signed-in user opens   │
                        └────────────┬─────────────┘
                                     │
                       role in the ACTIVE membership?
                                     │
                  ┌──────────────────┴──────────────────┐
            role = owner                          role = client
                  ▼                                     ▼
          ┌───────────────┐                     ┌────────────────┐
          │   COACH UI    │                     │   CLIENT UI    │
          │src/app/(coach)│                     │src/app/(client)│
          └───────────────┘                     └────────────────┘
```

Only one route group is mounted at a time.
[`src/app/index.tsx`](src/app/index.tsx) is the redirect gate:

```
not authenticated ────────────────────► /(auth)/login
profile incomplete ───────────────────► /(setup)/coach-profile | client-profile
owner ────────────────────────────────► /(coach)/(tabs)/home
client, no tenant ────────────────────► /(setup)/match-coach
client, tenant ───────────────────────► /(client)/(tabs)/today
```

### Persona vs role — they are not the same thing

| | `auth.persona` | `role` |
| --- | --- | --- |
| Values | `'coach'` \| `'customer'` | `'owner'` \| `'client'` |
| Comes from | The account you signed in as | The **active membership** |
| Decides | Which API surface (`/auth/*` vs `/auth/customer/*`) | Which **UI** you see |
| Lives in | `authSlice` + SecureStore | `membershipsSlice`, keyed by `tenantId` |

**Never gate UI on persona.** There is no global `role` — read it from the active
membership through `useActiveTenant()` / `useRole()`. There are exactly two roles;
there is no assistant-coach role.

### The root layout

[`src/app/_layout.tsx`](src/app/_layout.tsx) is the only place that mounts
providers and global listeners: `Provider` → `GestureHandlerRootView` →
`SafeAreaProvider`, session restore, the splash hand-off, and — critically —
`useChatEvents()` and `useAiEvents()`. Those two mount **once, here**. A handler
unmounted by a tab change loses the AI reply permanently.

---

## Project layout

```
src/
├── app/                  Routes ONLY — thin files that render a screen from a barrel
│   ├── (auth)/           login · register · verify · forgot/reset password
│   ├── (onboarding)/     first-run carousel
│   ├── (setup)/          coach/client profile setup · match-coach · intake
│   ├── (coach)/          Coach UI — (tabs) + activity, renewals, at-risk,
│   │                     check-ins, reviews, billing, plans/*, chat/[id]
│   ├── (client)/         Client UI — (tabs) + workout, nutrition, program,
│   │                     measurement, notifications
│   ├── coach/[tenantId]  public coach profile (client-facing)
│   ├── my-profile.tsx    one profile route, both personas
│   ├── index.tsx         the redirect gate
│   └── _layout.tsx       providers · session restore · splash · sockets
│
├── features/             The actual product code, organised BY UI
│   ├── coach/            home · clients · plans · inbox · assistant · checkins ·
│   │                     reviews · activity · at-risk · renewals · billing ·
│   │                     notifications · profile-setup
│   ├── client/           today · plan · progress · workout · nutrition · program ·
│   │                     chat · assistant · match-coach · coach-profile ·
│   │                     onboarding · notifications · profile-setup
│   └── shared/           auth · messaging · assistant · profile · plans ·
│                         measurements · reviews · setup
│
├── api/                  baseApi + 24 injected endpoint modules + upload helpers,
│                         token refresh, the tenant epoch guard, pagination
├── store/                auth · activeTenant · memberships · chatUi · assistant
├── shared/               ui/ recipes · hooks/ · components/ · utils/
├── tw/                   className-enabled RN wrappers (View, Text, Image, Tone, …)
├── lib/                  socket singletons (aiSocket, chatSocket) + domain helpers
└── global.css            the design system — every theme token lives here
```

Every feature folder is `screens/ · components/ · hooks/ · lib/` behind an
`index.ts` barrel. **A route file imports from the barrel and nothing else.**

### Where a new file goes

`shared/` means shared **code**, not a shared concept:

1. **Single-UI screen** → `coach/` or `client/`, with an *unprefixed* name
   (`coach/home` → `HomeScreen`).
2. **Same domain, a different screen per UI** (assistant, messaging) → split per UI;
   only the shared data layer — hooks, types, cache, **no screens** — goes in
   `shared/<domain>/`.
3. **Genuinely identical surface** (profile) → **one** screen in `shared/`.

| I want to… | Go to |
| --- | --- |
| Add a screen | `src/features/<ui>/<feature>/screens/`, then a thin route in `src/app/` |
| Add an API call | `src/api/endpoints/<domain>.endpoints.ts` (inject into `baseApi`) |
| Add a colour / radius / shadow | [`src/global.css`](src/global.css) — **never** an inline hex |
| Change the tab bars | `src/app/(coach)/(tabs)/_layout.tsx`, `src/app/(client)/(tabs)/_layout.tsx` |
| Touch auth or the tenant switch | `src/store/authSlice.ts`, `src/shared/hooks/useSwitchCoach.ts` |
| Touch chat | `src/features/shared/messaging/`, `src/lib/chatSocket.ts` |
| Touch the assistant | `src/features/shared/assistant/`, `src/lib/aiSocket.ts` |

---

## Feature modules

<details>
<summary><b>Coach</b> — 13 modules</summary>

| Module | What it owns |
| --- | --- |
| `home` | The analytics dashboard, "needs you now" queues, `useCoachHomeData`, fixtures |
| `clients` | Roster, `ClientDetailSheet`, invite sheet, join-request cards, client analytics |
| `plans` | Program + nutrition plan lists and day detail, publish/reschedule |
| `inbox` | Conversation list over the `/chat` socket |
| `assistant` | The coach-side AI screen, optionally scoped to a client |
| `checkins` | Pending check-in reviews and the per-client review flow |
| `reviews` | Reviews the coach has received |
| `activity` | The activity feed |
| `at-risk` | At-risk client queue |
| `renewals` | Upcoming renewals |
| `billing` | CoachHub subscription: plan cards, checkout, entitlements, result polling |
| `notifications` | Coach notification list |
| `profile-setup` | Coach onboarding profile |

</details>

<details>
<summary><b>Client</b> — 13 modules</summary>

| Module | What it owns |
| --- | --- |
| `today` | Today's workout + nutrition, streak heat-map, check-in prompt |
| `plan` | The assigned program and nutrition plan, week by week |
| `program` / `workout` | Program detail and set-by-set workout logging |
| `nutrition` | Nutrition plan detail and meal logging |
| `progress` | Measurements, progress photos, weight chart |
| `chat` | The single coach thread |
| `assistant` | The client-side AI screen |
| `match-coach` | Coach directory + join requests |
| `coach-profile` | A coach's public profile |
| `onboarding` | First-run carousel |
| `notifications` | Client notification list |
| `profile-setup` | Client onboarding profile |

</details>

<details>
<summary><b>Shared</b> — 8 modules (code shared by both UIs)</summary>

`auth` (login, register, verify, reset, Google Sign-In) · `messaging` (the chat data
layer + `useChatEvents`) · `assistant` (the AI data layer + `useAiEvents`) ·
`profile` (the one `/my-profile` screen) · `plans` · `measurements` · `reviews` ·
`setup`.

</details>

---

## The data layer

**One** `createApi` — [`src/api/baseApi.ts`](src/api/baseApi.ts) — with **24**
`endpoints/*.endpoints.ts` modules that `injectEndpoints`. There is no per-feature
`api.ts`.

```
activity · analytics · auth · billing · chat · clients · coachMedia · directory
exercises · foods · intake · invitations · joinRequests · meals · measurements
nutrition · nutritionPlans · onboarding · profile · programs · reviews · tenant
training · upload
```

### Auth and tenancy

- Tokens live in **`expo-secure-store`**, never in AsyncStorage and never in Redux.
  Redux holds *presence* and persona only.
- **The JWT carries the tenant.** `x-tenant-id` is sent by `baseApi`, but the server
  resolves the tenant from the token. A tenant switch is only real once the
  **re-scoped tokens are persisted**, then `resetApiState()` — see
  [`useSwitchCoach`](src/shared/hooks/useSwitchCoach.ts). A switch that doesn't swap
  tokens is cosmetic.
- `tenantId` in a query arg is a **cache key**, deliberately not forwarded as a param.
  It exists so two tenants keep two caches, and so tags can be scoped per tenant.
- A **tenant epoch** guard discards in-flight responses that were fetched under a
  previous tenant, and a fresh-token window stops a 401 storm from spending the
  single-use refresh token and logging the user out.
- **RBAC is enforced server-side.** Hidden UI is a UX decision, never a security boundary.

### Screen conventions

One hook per data-heavy screen returning
`{ …data, isLoading, isFetching, isError, refetchAll }` — `useCoachHomeData`,
`useTodayData`, `useCoachPlans`. Every data screen handles **loading, error and
empty**, with pull-to-refresh wherever data moves.

Details: [`docs/09-data-layer.md`](docs/09-data-layer.md),
[`docs/04-state-management.md`](docs/04-state-management.md),
[`docs/08-auth-and-tenancy.md`](docs/08-auth-and-tenancy.md).

---

## Real-time subsystems

### The AI assistant — async over a socket

Not REST. Not the `/chat` namespace. socket.io v4 on the **default** namespace:

```
client                                            server
  │  ai.requested  ─────────────────────────────────►│
  │◄─────────────────────────────  ai.accepted       │   (must arrive within 20s)
  │◄─────────────────────────────  ai.completed      │
  │◄──── ai.rejected · ai.timed_out · ai.unauthorized │
```

There are **no** RTK Query endpoints for it and nothing is persisted server-side.
One un-acknowledged ask at a time; never persist the thread. Rooms do not survive a
reconnect — a dropped socket means an outstanding answer is permanently gone. In
`__DEV__` every inbound frame is logged with an `[ai] ←` prefix.
See [`docs/06-Ai-Integration.md`](docs/06-Ai-Integration.md).

### Chat — socket-first with a REST fallback

On the `/chat` namespace, with a REST fallback. **Both paths must converge on the
same cache entry**, and both must tag the saved message with the `clientMsgId` it was
sent with — that reconciliation is what stops double sends and stuck optimistic
bubbles. See [`docs/10-chat-messaging.md`](docs/10-chat-messaging.md).

---

## Design system

- **All tokens** live in [`src/global.css`](src/global.css) — colours, radii, shadows,
  spacing. No inline hex, anywhere.
- [`src/tw/`](src/tw) exports `className`-enabled wrappers; [`src/shared/ui/`](src/shared/ui)
  holds the recipes: `Surface`, `Card`, `Icon`, `GlassButton`, `MetricGrid`,
  `Segmented`, `WeekProgress`, `WeightChart`, and friends.
- NativeWind is for **static** styling. Animate with **Reanimated 4** directly.
- `pb-tabbar` inside `(tabs)`, `pb-screen` on pushed screens. Never a magic padding value.

> **Import styled primitives from `@/tw`, never from `react-native`.**
> `globalClassNamePolyfill` is off, so a bare RN component silently drops `className` —
> the single most common cause of a blank screen in this repo.
> ```tsx
> import { View } from "@/tw";          // ✅
> import { View } from "react-native";  // ❌
> ```

### The `@expo/ui` boundary

Native OS controls (pickers, sliders, switches, sheets, grouped forms) use
[`@expo/ui`](docs/03-Expo-ui-guide.md) and **its** modifiers. Custom brand UI uses RN +
NativeWind `className`. **Styling does not cross a `Host`.**

### Version traps

NativeWind ↔ react-native-css ↔ Reanimated 4 ↔ react-native-worklets must agree. Use
`npx expo install` and `npx expo-doctor`; never hand-pick a version. `lightningcss` is
pinned to `1.30.1` in **both** `resolutions` and `overrides` — **do not unpin it**, or
`oklch` colours stop resolving.

---

## The invariants

Break one of these and the app is wrong in a way nothing here will catch for you.

1. **Per-tenant, never global.** Role, status and every piece of business data belong
   to the *active membership*, not the user.
2. **Persona ≠ role.** Persona picks the API surface; role picks the UI. Never gate UI
   on persona.
3. **The JWT carries the tenant.** A switch that doesn't persist re-scoped tokens is
   cosmetic.
4. **`tenantId` in a query arg is a cache key**, not a request param.
5. **Tokens never enter Redux.** SecureStore only.
6. **RBAC is server-side.** Hidden UI is not security.
7. **`@expo/ui` for native controls, RN + NativeWind for brand UI** — styling does not
   cross a `Host`.
8. **Import primitives from `@/tw`**, never from `react-native`.
9. **The AI assistant is async, socket-based and persists nothing.** One
   un-acknowledged ask at a time.
10. **Chat is socket-first with a REST fallback**, converging on one cache entry.
11. **`useChatEvents` / `useAiEvents` mount once, in the root layout** — never in a screen.
12. **Every data screen needs loading, error *and* empty states.** All three, every time.
13. **This is a development build.** Never write code that assumes Expo Go.

---

## Documentation map

Deep docs live in [`docs/`](docs), indexed by [`docs/Readme.md`](docs/Readme.md).
**Open the relevant doc before working in that area.** Where a doc and the source
disagree, **the source wins** — fix the doc in the same PR.

**Foundations**

| Doc | What's in it |
| --- | --- |
| [`01-architecture.md`](docs/01-architecture.md) | Two UIs, persona vs role, the real route tree, the boot sequence, tenant lifecycle |
| [`02-tech-stack.md`](docs/02-tech-stack.md) | Every dependency and why, the version traps, Metro/Babel/TS config |
| [`12-getting-started.md`](docs/12-getting-started.md) | Install, `.env`, prebuild, dev builds, EAS, troubleshooting |
| [`13-conventions.md`](docs/13-conventions.md) | Naming, where a new file goes, PR workflow, definition of done |

**Data layer**

| Doc | What's in it |
| --- | --- |
| [`04-state-management.md`](docs/04-state-management.md) | The store, the five slices, RTK Query patterns, the cache-tag catalogue |
| [`08-auth-and-tenancy.md`](docs/08-auth-and-tenancy.md) | Two personas, token storage + refresh, tenant switching, the tenant epoch |
| [`09-data-layer.md`](docs/09-data-layer.md) | `baseApi`, the endpoint modules, multipart conventions, uploads, pagination, errors |
| [`07-Uply-endpoints.md`](docs/07-Uply-endpoints.md) | Backend reference: routes, DTOs, enums, status codes |

**UI layer**

| Doc | What's in it |
| --- | --- |
| [`11-design-system.md`](docs/11-design-system.md) | Theme tokens, `src/tw`, Surface/Tone/Card, dark mode, safe-area padding |
| [`03-Expo-ui-guide.md`](docs/03-Expo-ui-guide.md) | `@expo/ui` usage and the `Host` boundary |
| [`05-Feature-Modules.md`](docs/05-Feature-Modules.md) | Every feature module: screens, hooks, endpoints, gotchas |

**Real-time**

| Doc | What's in it |
| --- | --- |
| [`06-Ai-Integration.md`](docs/06-Ai-Integration.md) | The assistant protocol, correlation, failure rules, tenant isolation |
| [`10-chat-messaging.md`](docs/10-chat-messaging.md) | Chat in full: data model, REST + socket contract, cache design, hooks |

---

## Contributing

### Workflow

```
feature/<name>  ──PR──►  dev  ──PR──►  main
```

Branch off `dev`, open a PR into `dev`; `dev` is promoted to `main` by PR. Keep
`package-lock.json` in sync, and re-run `npx expo prebuild` when native config or a
native dependency changes.

### Conventions

- Components `PascalCase` · hooks `useCamelCase` · endpoints `verbNoun`
  (`getClients`, `publishProgram`).
- Import through `@/` and through feature barrels. **No `../../..` chains.**
- **No `any`** without a justifying comment. The one justified case is an undocumented
  API response — which then goes through a normalizer.
- **No `console.log`** in commits.
- Comment **why**, not what. Most sharp edges in this repo are recorded next to the code.

### Definition of done

- [ ] Typed, role-gated via the **active membership**
- [ ] Tenant-scoped query args **and** cache tags
- [ ] Loading, error and empty states handled
- [ ] **Light and dark** both checked
- [ ] Runs in the dev build on **both** iOS and Android
- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean
- [ ] Behind a reviewed PR

There is no automated test suite — those last three lines *are* the gate.

### Troubleshooting

The common failures and what they actually mean are catalogued in
[`docs/12-getting-started.md §8`](docs/12-getting-started.md): blank screens from a
bare RN import, flat colours from a `lightningcss` drift, worklet crashes from a
Reanimated/worklets mismatch, "Cannot find native module" from a stale dev client,
empty screens from a tenant that never resolved, and surprise logouts from a 401 the
refresh couldn't recover.

---

## License

See [`LICENSE`](LICENSE).

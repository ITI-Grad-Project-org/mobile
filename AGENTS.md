# UPLY Mobile — Agent Instructions

React Native client for a multi-tenant fitness-coaching SaaS. One app, two UIs.
Stack: Expo SDK 56 (dev build, NOT Expo Go) · RN 0.85 · React 19.2 (React Compiler ON) ·
@expo/ui (SwiftUI/Compose) · NativeWind v5 / Tailwind v4 · Redux Toolkit + RTK Query ·
socket.io v4 · TypeScript strict.

Deep docs live in `docs/01..13`, indexed by `docs/Readme.md`. **Open the relevant
doc before working in that area.** Where a doc and the source disagree, the source
wins — fix the doc in the same PR.

## Non-negotiable rules (get these wrong = architectural breakage)
- PER-TENANT, NOT GLOBAL. A user has 0..N memberships, a different role per tenant.
  Never a global `role` or global "my data" — read role/status from the ACTIVE
  membership via useActiveTenant()/useRole(). Memberships are normalized by `tenantId`.
- PERSONA != ROLE. `auth.persona` ('coach'|'customer') picks the API surface
  (/auth/* vs /auth/customer/*). `role` ('owner'|'client') comes from the active
  membership and picks the UI. Never gate UI on persona. See docs/01 §2.
- THE JWT CARRIES THE TENANT. `x-tenant-id` is sent by baseApi but the server
  resolves the tenant from the token. A tenant switch MUST persist the re-scoped
  tokens, then resetApiState() — see useSwitchCoach. See docs/08.
- `tenantId` in query args is a CACHE KEY, deliberately not forwarded as a param.
  Every tenant-scoped endpoint takes it and tags by it. See docs/04 §8.
- RBAC is enforced SERVER-SIDE. Hidden UI is NOT security.
- Tokens go in expo-secure-store, never AsyncStorage / never in Redux state.
- @expo/ui vs NativeWind boundary: native controls = @expo/ui + its modifiers;
  custom/brand UI = RN + NativeWind className. Styling does NOT cross a `Host`. docs/03.
- IMPORT STYLED PRIMITIVES FROM `@/tw`, never `react-native` — bare RN components
  silently ignore `className` (globalClassNamePolyfill is off). docs/11 §4.
- The AI assistant is ASYNC over a SOCKET (socket.io v4, DEFAULT namespace;
  `ai.requested` -> `ai.accepted` -> `ai.completed`). NOT REST, NOT the `/chat`
  namespace. No api.ts, no RTK Query endpoints — nothing is persisted server-side.
  One un-acknowledged ask at a time. Never persist the thread. See docs/06.
- Chat is socket-first with a REST fallback on the `/chat` namespace. See docs/10.
- `useChatEvents` and `useAiEvents` mount ONCE, in src/app/_layout.tsx — never in a
  screen. A handler unmounted by a tab change loses the AI reply permanently.
- This is a DEVELOPMENT BUILD. Never write code that assumes Expo Go.

## Versions / setup traps
- NativeWind <-> react-native-css <-> Reanimated 4 <-> react-native-worklets must agree.
  Use `npx expo install` + `npx expo-doctor`; never hand-pick. `lightningcss` is pinned
  to 1.30.1 in both `resolutions` and `overrides` — do not unpin.
- NativeWind is for STATIC styling; animate with Reanimated 4 directly. docs/02.

## Two UIs
- role=owner  -> Coach UI  (src/app/(coach)/) tabs: Home · Clients · AI · Plans · Inbox
- role=client -> Client UI (src/app/(client)/) tabs: Today · Plan · AI · Progress · Chat
- FIVE tabs each. Profile is NOT a tab — it is behind the AppHeader avatar at
  `/my-profile` (one screen, both personas). The client AI tab is hidden until the
  client has joined a coach (a tenant-less token is rejected at handshake).
- Only one group is mounted at a time. `src/app/index.tsx` is the redirect gate.
- A user can be owner in one tenant and client in another. Switching can flip the UI.
- Roles are only `owner` and `client`. There is NO assistant-coach role.

## Project map
- Routes (thin): `src/app/` — file-based Expo Router, typedRoutes on. Import nav from
  `expo-router`, NOT @react-navigation/*. Groups: (auth), (onboarding), (setup),
  (coach), (client). A route file imports a screen from a feature barrel and renders it.
- Features: `src/features/{coach,client,shared}/<name>/` = screens/ components/ hooks/
  lib/ + index.ts. Organized BY UI. `shared/` means shared CODE, not shared concept:
  1. Single-UI screen -> coach/ or client/, UNPREFIXED name (coach/home -> HomeScreen).
  2. Same domain, different screen per UI (assistant, messaging) -> split per UI; only
     the shared data layer (hooks/types/cache, NO screens) lives in shared/<domain>/.
  3. Genuinely identical surface (profile) -> ONE screen in shared/.
- Data layer: `src/api/` — ONE `baseApi` (createApi) + 23 `endpoints/*.endpoints.ts`
  modules that injectEndpoints. There is no per-feature api.ts. docs/09.
- Store: `src/store/` — auth · activeTenant · memberships · chatUi · assistant + baseApi.
- Design system: `src/global.css` (ALL tokens) + `src/tw/` wrappers +
  `src/shared/ui/` recipes (Surface, Card, Icon, GlassButton). No inline hex. docs/11.

## Conventions
- Components PascalCase; hooks useCamelCase; endpoints verbNoun (getClients, publishProgram).
- Import through `@/` and through feature barrels. No `../../..` chains.
- Every data screen needs loading/error/empty states, and pull-to-refresh where data moves.
- One hook per data-heavy screen returning { …data, isLoading, isFetching, isError, refetchAll }
  (useCoachHomeData, useTodayData, useCoachPlans).
- `pb-tabbar` inside (tabs), `pb-screen` on pushed screens. Never a magic padding value.
- No `any` without a justifying comment — the justified case is an undocumented API
  response, which then goes through a normalizer. No console.log in commits.
- Comment WHY, not what. Most sharp edges here are recorded next to the code.

## Scope notes
- Nutrition IS built (client logging + coach plans). Training, measurements/check-ins,
  reviews, directory/join-requests and analytics are built.
- Plan AUTHORING lives in the web dashboard: the app reads plans and links out to
  EXPO_PUBLIC_DASHBOARD_URL (empty = every such link hides). The builder endpoints
  exist and are typed but are not surfaced in mobile UI.
- BILLING is built: the COACH's own CoachHub subscription (Free/Solo/Studio via
  Paymob), at src/features/coach/billing + /(coach)/billing. NOT coach-to-client
  payments — those don't exist. Paymob's redirect target is configured server-side
  as a WEB page, so nothing returns into the app: checkout opens in a WebBrowser
  and the result screen POLLS `/billing/payments/:id`. A dismissed browser, a
  Paymob success screen and `success=true` are all worthless as proof. Gate UI on
  `plan` (effective), never `storedPlan`. Client-limit and AI-builder 403s are
  enforced server-side AT ACTIVATION, so every gate also handles a live 403.
- Not in scope: push/SMS, scheduling, agentic AI, marketplace, coach-to-client
  payments. Billing V1 has no recurring charge, cancellation, refund, invoice or
  proration — never write copy implying an automatic monthly charge.
- Client invitation routes are dormant behind `CLIENT_INVITATIONS_READY = false` —
  they 401 server-side, and a 401 escalates to a full logout.

## Definition of done
- Typed, role-gated via the active membership, tenant-scoped args + tags,
  loading/error/empty handled, light AND dark checked, works in the dev build on
  BOTH iOS + Android, behind a reviewed PR.
- Run `npm run typecheck` and `npm run lint` before declaring done. There is no test suite.

## Commands
- Start: `npx expo start --dev-client`   Typecheck: `npm run typecheck`   Lint: `npm run lint`
- Doctor: `npx expo-doctor`   Native: `npx expo prebuild` + `npx expo run:ios|run:android`
- Setup, env vars and troubleshooting: docs/12-getting-started.md.

## Expo Skills
- Use Expo's official agent Skills for Expo-specific tasks (upgrading-expo, native UI, EAS,
  dev client). Prefer them over ad-hoc instructions. For SDK upgrades use `upgrading-expo`.

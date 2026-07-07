# CoachHub Mobile — Agent Instructions

React Native client for a multi-tenant fitness-coaching SaaS.
Stack: Expo SDK 56 (dev build, NOT Expo Go) · RN 0.85 · React 19.2 ·
@expo/ui (SwiftUI/Compose) · NativeWind · Redux Toolkit + RTK Query · TypeScript strict.

## Non-negotiable rules (get these wrong = architectural breakage)
- PER-TENANT, NOT GLOBAL. A user has 0..N tenant memberships, a different role per tenant.
  Never use a global `role` or global "my data". Read role/status from the ACTIVE membership.
  Memberships are normalized by `tenantId`. See docs/01-architecture.md, docs/04-state-management.md.
- Every server call is scoped to the active tenant via the `x-tenant-id` header in the base query.
  Tag RTK Query cache by `tenantId`. Pass `tenantId` as a query arg so caches are per-tenant.
- RBAC is enforced SERVER-SIDE. Hidden UI is NOT security. Gate UI with useRole(), never assume.
- @expo/ui vs NativeWind boundary: native controls = @expo/ui + its modifiers;
  custom/brand UI = RN + NativeWind className. Styling does NOT cross a `Host`. See docs/03.
- This is a DEVELOPMENT BUILD. Never write code that assumes Expo Go.
- Tokens go in expo-secure-store, never AsyncStorage / never in Redux state.
- The AI assistant is ASYNC (job-ticket: POST -> jobId -> poll). See docs/06.
- v1 SCOPE ONLY. No push/SMS, no live Paymob payment, no scheduling, no nutrition,
  no agentic AI, no marketplace. Billing is concept-only (plan/tier model + gating). See docs/05.

## Versions / setup traps
- NativeWind <-> Reanimated 4 <-> @expo/ui worklets must agree. Use `npx expo install` + `npx expo-doctor`
  to resolve versions; never hand-pick. Prefer NativeWind for STATIC styling only; animate with
  Reanimated 4 directly. See docs/02-tech-stack-decisions.md.

## Two UIs
- The app shows TWO interfaces, chosen by the user's role in the ACTIVE tenant:
  role=owner -> Coach UI (route group app/(coach)/, tabs: Home/Clients/Plans/AI/Inbox/Profile)
  role=client -> Client UI (route group app/(client)/, tabs: Today/Plan/Progress/Messages/Profile)
- Only one group is mounted at a time. The root app/_layout.tsx redirects based on role
  (owner -> /(coach)/home, client -> /(client)/today).
- NOTE: coach has 6 tabs (over the native 5-item comfort limit) — see the six-tabs note in docs/01.
- A user can be owner in one tenant and client in another (same login). Switching tenants can flip the UI.
- There is NO assistant-coach role. Roles are only: owner, client.

## Project map
- Routes (thin): app/  — file-based Expo Router. Import nav from `expo-router`, NOT @react-navigation/*.
  Groups: (auth), (onboarding), (coach), (client). Route files just import a screen from src/features.
- Features: src/features/{coach,client,shared}/<name>/ = screens + components + hooks + api.ts (injectEndpoints).
  Organized BY UI. `shared/` means shared CODE, not shared concept — three placement rules:
  1. Single-UI screen -> under coach/ or client/, UNPREFIXED name (e.g. coach/home -> HomeScreen).
  2. Same domain but a DIFFERENT screen per UI (assistant, messaging) -> screens split per UI
     (coach/assistant + client/assistant; coach/inbox + client/chat); only their shared data layer
     (api.ts/types.ts, NO screens) lives in shared/<domain>/.
  3. Genuinely unifiable surface (profile) -> ONE screen in shared/, role-agnostic name, both routes render it.
- Store: src/store/ (api.ts, activeTenantSlice, authSlice). Shared: src/shared/ (ui wrappers, hooks).
- Deep docs live in docs/01..09. Open the relevant one before working in that area.

## Conventions
- Components PascalCase; hooks useCamelCase; endpoints verbNoun (getClients, assignProgram).
- Every data screen needs loading/error/empty states (shared components exist).
- No `any` without a justifying comment. No console.log in commits.

## Definition of done
- Typed, role-gated correctly (check the access matrix), tenant-scoped calls,
  works in dev build on BOTH iOS + Android, behind a reviewed PR.
- Run `npm run typecheck` and `npm run lint` before declaring done.

## Commands
- Start: `npx expo start --dev-client`   Typecheck: `npm run typecheck`   Lint: `npm run lint`
- Doctor: `npx expo-doctor`   New dev build: via EAS (see docs/09-getting-started.md).

## Expo Skills
- Use Expo's official agent Skills for Expo-specific tasks (upgrading-expo, native UI, EAS, dev client).
  Prefer them over ad-hoc instructions. For SDK upgrades use the `upgrading-expo` skill.
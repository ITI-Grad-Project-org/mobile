# UPLY Mobile — Agent Instructions

React Native client for a multi-tenant fitness-coaching SaaS.

**Stack:** Expo SDK 56 (dev build, NOT Expo Go) · RN 0.85 · React 19.2 · @expo/ui
(SwiftUI/Compose) · NativeWind v4 · TypeScript strict. Redux Toolkit + RTK Query is the
intended state layer (see "Current state" below — not installed yet).

> ## ⚠️ Expo SDK 56 has changed
> Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing
> any Expo code. APIs differ from older SDKs and from training data. Prefer Expo's official
> agent **Skills** (`expo:*`) for Expo-specific work over ad-hoc instructions.

## Current state (what actually exists vs. what's planned)
This repo is freshly scaffolded. Do not assume planned structure exists — verify, then build it.
- **Exists now:** `src/app/index.tsx` (Expo Router entry via `expo-router/entry`), `src/global.css`,
  NativeWind v4 + tailwindcss v3, `expo-secure-store`, `@expo/ui`, EAS configured (`eas.json`).
- **Planned / not built yet:** Redux Toolkit + RTK Query, `src/features/*`, `src/store/*`,
  `src/shared/*`, the `docs/01..09` deep docs, multi-tenant membership logic. The rules below
  describe the target architecture — follow them when you build these pieces.

## Non-negotiable rules (get these wrong = architectural breakage)
- **PER-TENANT, NOT GLOBAL.** A user has 0..N tenant memberships, a different role per tenant.
  Never use a global `role` or global "my data". Read role/status from the ACTIVE membership.
  Memberships are normalized by `tenantId`.
- **Tenant-scoped server calls.** Every server call is scoped to the active tenant via the
  `x-tenant-id` header in the base query. Tag RTK Query cache by `tenantId` and pass `tenantId`
  as a query arg so caches are per-tenant.
- **RBAC is enforced SERVER-SIDE.** Hidden UI is NOT security. Gate UI with `useRole()`, never assume.
- **@expo/ui vs NativeWind boundary:** native controls = `@expo/ui` + its modifiers;
  custom/brand UI = RN + NativeWind `className`. Styling does NOT cross a `Host`.
- **This is a DEVELOPMENT BUILD.** Never write code that assumes Expo Go.
- **Tokens go in `expo-secure-store`**, never AsyncStorage, never in Redux state.
- **The AI assistant is ASYNC** (job-ticket: POST → jobId → poll).
- **v1 SCOPE ONLY.** No push/SMS, no live Paymob payment, no scheduling, no nutrition,
  no agentic AI, no marketplace. Billing is concept-only (plan/tier model + gating).

## Versions / setup traps
- NativeWind ↔ Reanimated 4 ↔ @expo/ui worklets must agree. Use `npx expo install` +
  `npx expo-doctor` to resolve versions; never hand-pick. Prefer NativeWind for STATIC styling
  only; animate with Reanimated 4 directly.
- React Compiler is **enabled** (`app.json` → `experiments.reactCompiler`). Don't add manual
  `useMemo`/`useCallback` micro-optimizations the compiler already handles.
- Typed routes are **on** (`experiments.typedRoutes`). Use the generated route types.

## Project map
- **Routes (thin):** `src/app/` — file-based Expo Router. Import nav from `expo-router`,
  NOT `@react-navigation/*`. (Note: routes live under `src/app`, not a top-level `app/`.)
- **Path alias:** `@/*` → `./src/*`, `@/assets/*` → `./assets/*` (see `tsconfig.json`).
- **Features (planned):** `src/features/<name>/` = screens + components + hooks + `api.ts`
  (`injectEndpoints`).
- **Store (planned):** `src/store/` (`api.ts`, `activeTenantSlice`, `authSlice`).
- **Shared (planned):** `src/shared/` (ui wrappers, hooks).

## Conventions
- Components PascalCase; hooks `useCamelCase`; endpoints `verbNoun` (`getClients`, `assignProgram`).
- Every data screen needs loading/error/empty states (build shared components for these).
- No `any` without a justifying comment. No `console.log` in commits.

## Definition of done
- Typed, role-gated correctly (check the access matrix), tenant-scoped calls,
  works in dev build on BOTH iOS + Android, behind a reviewed PR.
- Run `npm run typecheck` and `npm run lint` before declaring done.

## Commands
- Start (dev client): `npx expo start --dev-client`
- Typecheck: `npm run typecheck` (`tsc --noEmit`)
- Lint: `npm run lint` (`expo lint`)
- Doctor: `npx expo-doctor`
- New dev build: via EAS (`eas build --profile development`).

## Expo Skills
Use Expo's official agent Skills for Expo-specific tasks (`upgrading-expo`, native UI/`expo-ui`,
EAS deployment, dev client). Prefer them over ad-hoc instructions. For SDK upgrades use the
`upgrading-expo` skill.

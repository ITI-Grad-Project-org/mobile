# UPLY Mobile

**One React Native app that shows two products.** UPLY is the mobile client for a
multi-tenant fitness-coaching SaaS: coaches run their business in it, and their
clients train through it. Which interface you get is decided by your role in the
tenant you are currently in — the same login can be a coach in one gym and a
client of another.

```
Expo SDK 56  ·  React Native 0.85  ·  React 19.2  ·  TypeScript 6 (strict)
Expo Router (file-based)  ·  Redux Toolkit + RTK Query  ·  NativeWind v5 / Tailwind v4
socket.io v4 (chat + AI)  ·  expo-secure-store  ·  Development build — NOT Expo Go
```

| | |
| --- | --- |
| **Docs** | [`docs/Readme.md`](docs/Readme.md) — start here |
| **Agent rules** | [`AGENTS.md`](AGENTS.md) (also loaded as `CLAUDE.md`) |
| **Source** | `src/` — routes in `src/app`, features in `src/features`, data layer in `src/api` |
| **Size** | ~42k lines of TS/TSX across ~375 files |

---

## What the app does

**Coach UI** (`role = owner`) — five native tabs plus a header:

| Tab | Screen | What it is |
| --- | --- | --- |
| Home | `coach/home` | Analytics dashboard: roster stats, "needs you now" queues, week activity, insights |
| Clients | `coach/clients` | Roster, per-client analytics, invitations, join requests |
| AI | `coach/assistant` | Async AI assistant, optionally scoped to one client |
| Plans | `coach/plans` | Training programs + nutrition plans, day-by-day, read/publish/reschedule |
| Inbox | `coach/inbox` | Every client conversation, live over the `/chat` socket |

Pushed from Home/header: Activity feed, Renewals, At-risk, Check-in reviews, Coach
reviews, Notifications, Profile.

**Client UI** (`role = client`) — five native tabs:

| Tab | Screen | What it is |
| --- | --- | --- |
| Today | `client/today` | Today's workout, nutrition cards, streak heat-map, check-in prompt |
| Plan | `client/plan` | The assigned program and nutrition plan, week by week |
| AI | `client/assistant` | Same assistant, grounded in their coach's knowledge base (hidden until they join a coach) |
| Progress | `client/progress` | Measurements, progress photos, charts |
| Chat | `client/chat` | The single thread with their coach |

Pushed: workout logging, nutrition logging, program/plan detail, measurement form,
coach public profile, notifications, profile.

---

## Quick start

**Prerequisites:** Node LTS + npm · Xcode (iOS) · Android Studio (Android) · `eas-cli` for cloud builds.

```bash
git clone <repo> && cd UPLY-App
npm install
cp .env.example .env          # then fill in the values below
npx expo prebuild             # ios/ and android/ are generated, not committed
npx expo run:ios              # or: npx expo run:android
```

After the first native build, day-to-day work is just:

```bash
npx expo start --dev-client   # add --clear after config changes
```

> **This is a development build, not Expo Go.** `@expo/ui`, native tabs,
> `expo-secure-store`, Google Sign-In and the socket transports all require the
> custom dev client. Nothing in this repo may assume Expo Go.

Full setup, environment variables and troubleshooting: [`docs/12-getting-started.md`](docs/12-getting-started.md).

### Environment

`.env` is gitignored. Required keys:

| Key | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | REST + socket.io base URL |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Sign-In (Android / server) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google Sign-In (iOS) |
| `EXPO_PUBLIC_DASHBOARD_URL` | Web dashboard where plans are authored; empty hides every link to it |
| `EXPO_PUBLIC_HOME_FIXTURES` | Dev only — render coach Home from fixtures (`all` / `clear` / `nulls`) |

---

## Commands

| Command | Description |
| --- | --- |
| `npx expo start --dev-client` | Start Metro against the dev build |
| `npm run ios` / `npm run android` | Build and run natively |
| `npm run typecheck` | `tsc --noEmit` — must pass before a PR |
| `npm run lint` | ESLint (`eslint-config-expo`) — must pass before a PR |
| `npx expo-doctor` | Verify dependency versions agree |
| `npx expo prebuild --clean` | Regenerate `ios/` + `android/` after native config changes |

---

## How the code is laid out

```
src/
├── app/                 Routes only — thin files that render a screen
│   ├── (auth)/          login · register · verify · forgot/reset password
│   ├── (onboarding)/    first-run carousel
│   ├── (setup)/         profile setup · coach matching · intake
│   ├── (coach)/         Coach UI — (tabs) + pushed screens
│   ├── (client)/        Client UI — (tabs) + pushed screens
│   ├── coach/[tenantId] public coach profile (client-facing)
│   ├── my-profile.tsx   one profile route, renders per persona
│   └── _layout.tsx      providers, session restore, splash, sockets
│
├── features/            The actual product code, organised BY UI
│   ├── coach/           home · clients · plans · inbox · assistant · checkins · reviews · …
│   ├── client/          today · plan · progress · workout · nutrition · chat · assistant · …
│   └── shared/          code genuinely reused by both: auth, messaging, assistant, profile, setup
│
├── api/                 baseApi + 23 injected endpoint modules + upload/multipart helpers
├── store/               Redux store: auth · activeTenant · memberships · chatUi · assistant
├── shared/              ui/ primitives · hooks/ · utils/ · components/
├── tw/                  className-enabled RN wrappers (View, Text, Image, Tone, …)
├── lib/                 socket singletons, formatting, small domain helpers
└── global.css           the design system — all theme tokens live here
```

Each feature folder is `screens/ · components/ · hooks/ · lib/` with an
`index.ts` barrel. Route files import from the barrel and nothing else.

---

## The five rules that keep this app correct

1. **Per-tenant, never global.** Role, status and every piece of business data
   belong to the *active membership*, not the user. Read them through
   `useActiveTenant()` / `useRole()`.
2. **The JWT carries the tenant.** Switching coaches means swapping tokens, then
   resetting the RTK Query cache — see [`useSwitchCoach`](src/shared/hooks/useSwitchCoach.ts).
   A switch that doesn't persist new tokens is cosmetic.
3. **Tokens live in `expo-secure-store`, never in Redux.** Redux holds *presence*
   and persona only.
4. **RBAC is server-side.** Hidden UI is not security.
5. **`@expo/ui` for OS-native controls, RN + NativeWind for brand UI.** Styling
   does not cross a `Host` boundary.

---

## Documentation map

| Doc | What's in it |
| --- | --- |
| [`docs/01-architecture.md`](docs/01-architecture.md) | Two UIs, personas vs roles, the real route tree, app bootstrap |
| [`docs/02-tech-stack.md`](docs/02-tech-stack.md) | Every dependency and why, version traps, build config |
| [`docs/03-Expo-ui-guide.md`](docs/03-Expo-ui-guide.md) | `@expo/ui` usage and the `Host` boundary |
| [`docs/04-state-management.md`](docs/04-state-management.md) | The store, the five slices, RTK Query conventions, cache tags |
| [`docs/05-Feature-Modules.md`](docs/05-Feature-Modules.md) | Every feature module: screens, hooks, endpoints |
| [`docs/06-Ai-Integration.md`](docs/06-Ai-Integration.md) | The AI assistant socket protocol |
| [`docs/07-Uply-endpoints.md`](docs/07-Uply-endpoints.md) | Backend API reference (routes, DTOs, enums) |
| [`docs/08-auth-and-tenancy.md`](docs/08-auth-and-tenancy.md) | Login, tokens, refresh, tenant switching, the epoch guard |
| [`docs/09-data-layer.md`](docs/09-data-layer.md) | `baseApi`, endpoint modules, uploads, pagination, errors |
| [`docs/10-chat-messaging.md`](docs/10-chat-messaging.md) | Chat in full: REST + socket, cache design, hooks |
| [`docs/11-design-system.md`](docs/11-design-system.md) | Theme tokens, `src/tw`, Surface/Tone/Card, dark mode |
| [`docs/12-getting-started.md`](docs/12-getting-started.md) | First run, env, dev builds, troubleshooting |
| [`docs/13-conventions.md`](docs/13-conventions.md) | Naming, file placement, PR workflow, definition of done |

---

## Working together

- Branch off `main` (`feature/<name>`), open a PR, keep `package-lock.json` in sync.
- Run `npm run typecheck` **and** `npm run lint` before you say it's done.
- Re-run `npx expo prebuild` when native config or native dependencies change.
- Test on **both** iOS and Android — the tab bars, insets and blur effects differ.

## License

See [`LICENSE`](LICENSE).

# 01 — Architecture

How the app is put together, in the order you need to understand it: the two
interfaces, the two identity concepts that decide which one you get, the real
route tree, and what happens between launch and first paint.

---

## 1. One app, two interfaces

UPLY renders **two entirely separate navigation trees**. They are not one set of
screens with things hidden — they are different tab bars, different stacks,
different feature folders.

```
┌──────────────────────────── COACH UI ─────────────────────────────┐
│  Home  │  Clients  │  AI  │  Plans  │  Inbox                      │
│  🏠       👥        🧠      📅       ✉️  (badge: unread)          │
└───────────────────────────────────────────────────────────────────┘
        src/app/(coach)/(tabs)/  →  src/features/coach/*

┌──────────────────────────── CLIENT UI ────────────────────────────┐
│  Today  │  Plan  │  AI*  │  Progress  │  Chat                     │
│  🏠        📅      ✨       📈          💬  (badge: unread)        │
└───────────────────────────────────────────────────────────────────┘
        src/app/(client)/(tabs)/  →  src/features/client/*

        * hidden until the client has joined a coach — see §6
```

Both tab bars are **native** (`expo-router/unstable-native-tabs` → `NativeTabs`),
themed from one place: [`useNativeTabsTheme`](../src/shared/hooks/useNativeTabsTheme.ts).
That hook mirrors the `--primary` / `--muted-foreground` tokens as literal colour
values, because `NativeTabs` props are native and cannot read CSS variables.

> **Both UIs have five tabs, not six.** Profile is *not* a tab. It sits behind the
> avatar in [`AppHeader`](../src/shared/components/AppHeader.tsx) and opens the
> shared `/my-profile` route. An older draft of `AGENTS.md` describes six coach
> tabs including Profile; the code is the authority.

Above both tab bars, each group's `_layout.tsx` renders `AppHeader` — logo, theme
toggle, notification bell (with a real pending-items badge) and the avatar.

---

## 2. Persona vs role — the distinction everything hangs on

There are **two** identity concepts in this codebase and they are not the same.

| | **Persona** | **Role** |
| --- | --- | --- |
| Values | `'coach'` \| `'customer'` | `'owner'` \| `'client'` |
| Lives in | `auth.persona` (Redux) + `expo-secure-store` | the active **membership** |
| Set by | which auth endpoints you signed in through | the tenant you are currently in |
| Scope | the whole account, for the session | per tenant, can differ between tenants |
| Decides | which `/auth/*` routes and `/me` endpoint to call | which UI and which data you see |

```
persona = 'coach'    → /auth/login,          /auth/me,          /coaches/me
persona = 'customer' → /auth/customer/login, /auth/customer/me, /clients/me
```

A person signed in as `customer` can hold several memberships. Each carries its
own `role` and `status`:

```
        Sara's single account (persona = 'customer')
                          │
        ┌─────────────────┴──────────────────┐
   tenant: "Coach Mike"              tenant: "Coach Lina"
   role = client                     role = client
   status = active                   status = paused
        │                                    │
        ▼                                    ▼
   full Client UI                     read-only-ish Client UI
```

And a coach account (`persona = 'coach'`) resolves to exactly one tenant — their
own — with `role = 'owner'`, synthesised in `_layout.tsx` from `GET /auth/me`.

**Never branch on persona when you mean role.** `useRole()` reads the active
membership; `auth.persona` only tells you which API surface to talk to.

```ts
// src/shared/hooks/useRole.ts
const { role } = useActiveTenant();
return { role, isCoach: role === 'owner', isClient: role === 'client' };
```

The one sanctioned exception is [`useChatRole`](../src/features/shared/messaging/useChatRole.ts),
which falls back to persona while the membership is still resolving — chat has to
pick a side before the roster lands.

---

## 3. The active tenant

The app tracks exactly one **active tenant** at a time.

```
store.activeTenant = { tenantId: string | null, switching: boolean }
store.memberships  = entity adapter keyed by tenantId
```

The active tenant decides two things:

1. **Which UI** — `role` in that membership.
2. **Which data** — every request is resolved against the tenant encoded in the
   JWT, and every RTK Query cache entry is keyed by `tenantId`.

It is persisted to `expo-secure-store` under `activeTenantId` so the same tenant
survives a relaunch, and `switching: true` holds the branded splash over the whole
swap so no screen is ever painted half-switched.

Switching is a **token operation**, not a state toggle — see
[`08-auth-and-tenancy.md`](08-auth-and-tenancy.md).

---

## 4. The real route tree

Routes live in `src/app/` (Expo Router picks up `src/app` automatically). Route
files are thin: import a screen from a feature barrel, render it.

```
src/app/
├── _layout.tsx                     ← providers · session restore · sockets · splash
├── index.tsx                       ← the redirect gate (§5)
├── my-profile.tsx                  → features/shared/profile          (both personas)
├── coach/[tenantId].tsx            → features/client/coach-profile    (public coach page)
│
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx  ·  register.tsx      → features/shared/auth · AuthScreen
│   ├── verify.tsx                      → VerifyScreen  (OTP)
│   └── forgot-password.tsx · reset-password.tsx
│
├── (onboarding)/
│   └── onboarding.tsx              → features/client/onboarding (first-run carousel)
│
├── (setup)/                        ← post-signup, pre-app
│   ├── coach-profile.tsx           → features/coach/profile-setup
│   ├── client-profile.tsx          → features/client/profile-setup
│   ├── match-coach.tsx             → features/client/match-coach (directory + join request)
│   └── intake.tsx                  → ClientIntakeScreen
│
├── (coach)/
│   ├── _layout.tsx                 ← AppHeader + Stack
│   ├── (tabs)/
│   │   ├── _layout.tsx             ← NativeTabs ×5
│   │   ├── home.tsx  clients.tsx  ai.tsx  plans.tsx  inbox.tsx
│   ├── chat/[id].tsx               → ConversationScreen (id = client USER id)
│   ├── activity.tsx  renewals.tsx  at-risk.tsx  reviews.tsx  notifications.tsx
│   ├── check-ins/index.tsx  ·  check-ins/[clientId].tsx
│   └── plans/
│       ├── training/[programId]/index.tsx
│       ├── training/[programId]/days/[programDayId].tsx
│       ├── nutrition/[planId]/index.tsx
│       └── nutrition/[planId]/days/[dayId].tsx
│
└── (client)/
    ├── _layout.tsx                 ← AppHeader + Stack + useSyncClientTimezone()
    ├── (tabs)/
    │   ├── _layout.tsx             ← NativeTabs ×5 (AI hidden without a tenant)
    │   ├── today.tsx  plan.tsx  ai.tsx  progress.tsx  chat.tsx
    ├── measurement.tsx             ← modal
    ├── notifications.tsx           ← modal
    ├── workout/[programDayId].tsx  → WorkoutLogScreen
    ├── program/[programId].tsx     → ProgramDetailsScreen
    ├── nutrition/[dayId].tsx       → NutritionLogScreen
    └── nutrition/plan/[planId].tsx → NutritionPlanDetailsScreen
```

A route file, in full:

```tsx
// src/app/(coach)/(tabs)/clients.tsx
import { ClientsScreen } from "@/features/coach/clients";
import { View } from "@/tw";

export default function CoachClientsRoute() {
  return (
    <View className="flex-1 bg-background px-4">
      <ClientsScreen />
    </View>
  );
}
```

That is the whole contract: **layout chrome and padding in the route, everything
else in the feature.** `typedRoutes` is on (`app.json` → `experiments`), so hrefs
are type-checked.

---

## 5. Boot sequence

[`src/app/_layout.tsx`](../src/app/_layout.tsx) is the only place that knows how a
session comes back to life. In order:

```
1. SplashScreen.preventAutoHideAsync()
2. restoreSession()
     read accessToken + persona from SecureStore
     → dispatch setAuth({ persona, profileCompleted })
     → read activeTenantId from SecureStore → dispatch setActiveTenant
     → always dispatch setLoading(false)   (even when signed out)
3. Persona-gated identity query, with refetchOnMountOrArgChange: true
     coach    → GET /auth/me                    → one synthesised owner membership
     customer → GET /auth/customer/memberships  → 0..N memberships
4. Reconcile the active tenant
     persisted tenant wins; otherwise pick the first `active` membership
5. useChatEvents()  and  useAiEvents()          ← app-wide, mounted ONCE, here
6. Not authenticated? router.dismissAll() + replace('/(auth)/login')
7. Hide the native splash; AnimatedSplash covers the handoff
```

Two details worth knowing before you touch this file:

- **`refetchOnMountOrArgChange: true` is load-bearing.** The login screen primes
  these queries with lazy triggers. If that prime failed, the cache holds an
  *error* entry — and subscribing to a cached error does not retry. Without the
  flag, the active tenant would stay `null` for the whole session and every
  tenant-scoped query would skip.
- **The `Stack` is keyed by a tenant epoch.** A real tenant change increments
  `tenantView.epoch`, remounting the entire navigator so no screen survives with
  derived state from the previous coach. The key is adjusted *during render*, not
  in an effect, so the remount and the splash land in the same commit.

### Why the sockets live in the root layout

Both `useChatEvents` and `useAiEvents` are mounted once, at the root:

- **Chat** — inbox rows and the tab badge must stay live from any tab.
- **AI** — an answer arrives seconds after the ask. Socket rooms do not survive a
  reconnect and nothing is persisted server-side, so a handler unmounted by a tab
  change loses the reply *permanently*. There is no endpoint to fetch it from.

Never mount either hook in a screen.

---

## 6. The redirect gate

[`src/app/index.tsx`](../src/app/index.tsx) is the bouncer. Read top to bottom:

```tsx
if (!isAuthenticated)                     → /(auth)/login
if (!profileCompleted)
     persona==='coach' || role==='owner'  → /(setup)/coach-profile
     else                                 → /(setup)/client-profile
if (persona==='coach' || role==='owner')  → /(coach)/(tabs)/home
if (!tenantId)                            → /(setup)/match-coach
                                          → /(client)/(tabs)/today
```

`profileCompleted` is a device-local flag (`uply.hasCompletedProfile` in
SecureStore, via [`useProfileSetup`](../src/shared/hooks/useProfileSetup.ts)), with
`profileLooksComplete()` as a server-side sanity check at login so a reinstall
doesn't send a fully-configured user back through setup.

**A client with no tenant is a normal state**, not an error: they have signed up
but not yet joined a coach. That is why the client AI tab is hidden — a
tenant-less token has nothing to ground a knowledge-base lookup against, and the
gateway rejects it at handshake with `ai.unauthorized`.

---

## 7. Feature organisation

`src/features/` is organised **by UI**, not by domain:

```
features/
├── coach/     home · clients · plans · inbox · assistant · activity ·
│              checkins · reviews · renewals · at-risk · notifications · profile-setup
├── client/    today · plan · progress · workout · nutrition · program · chat ·
│              assistant · coach-profile · match-coach · notifications ·
│              onboarding · profile-setup
└── shared/    auth · messaging · assistant · profile · setup · measurements ·
               plans · reviews
```

Three placement rules:

1. **A screen belonging to one UI** → under `coach/` or `client/`, with an
   *unprefixed* name (`coach/home` → `HomeScreen`).
2. **Same domain, genuinely different screen per UI** → split
   (`coach/inbox` + `client/chat`; `coach/assistant` + `client/assistant`). Only
   the shared *data layer* goes in `shared/<domain>/` — hooks, types, cache
   helpers, **no screens**.
3. **A genuinely identical surface** → one screen in `shared/`
   (`shared/profile/ProfileScreen`, rendered by `/my-profile` for both personas;
   `shared/auth` for the role-agnostic auth flow).

`shared/` means *shared code*, never *shared concept*. Inside a feature:

```
<feature>/
├── screens/       one screen per file, default-exported through index.ts
├── components/    presentational pieces used only by this feature
├── hooks/         data assembly — one hook per screen where the screen is big
├── lib/           pure functions: normalisers, formatters, derivations
└── index.ts       the barrel — the only thing routes and siblings import
```

The pattern to copy for a data-heavy screen is `useCoachHomeData` /
`useTodayData`: **one hook resolves the screen as a single unit**, exposing one
`isLoading`, one `isFetching` and one `refetchAll`. Today's screen pulls ten reads
across four features; without that hook it reflowed five times per visit.

---

## 8. Membership lifecycle

A membership is not binary — and it runs **per tenant**, so a client can be
`active` under one coach and `paused` under another at the same time.

```
invited ──accept──▶ active ──pause──▶ paused ──resume──▶ active
   │                   │                                   │
   └──decline──▶ gone  └───────────remove──────────▶ removed
```

What the app does with each:

| Status | Behaviour |
| --- | --- |
| `invited` | Surfaces in the client's notifications as an invitation card |
| `active` | Full UI for the role |
| `paused` | Still readable; **chat stays open** (`canChat` allows `active` and `paused`) |
| `removed` | The membership disappears from the tenant list |

`canChat` / `threadAllowsChat` in
[`features/shared/messaging/types.ts`](../src/features/shared/messaging/types.ts)
are the single source of truth for "may these two people message each other".

---

## 9. Two entry paths into a coaching relationship

Both exist, and they are inverses:

```
INVITATION                              JOIN REQUEST
coach → POST /invitation                client → POST /client/me/join-requests
client sees it in notifications         coach sees it in Clients / notifications
client accepts → membership             coach approves → membership
```

Discovery for the join-request path is the **coach directory**
(`GET /coaches/directory`), rendered by `features/client/match-coach` and the
public profile at `/coach/[tenantId]`.

> The client-side invitation routes (`GET|DELETE /client/me/invitations`) are not
> live server-side yet. They are gated behind `CLIENT_INVITATIONS_READY = false`
> in [`invitations.endpoints.ts`](../src/api/endpoints/invitations.endpoints.ts),
> because a 401 from them would be escalated to a full logout by the reauth
> wrapper. Flip the flag when the backend ships them.

---

## 10. Where the seams are

| Concern | Owner | Note |
| --- | --- | --- |
| Navigation | `src/app/**` | Thin. Import from `expo-router`, never `@react-navigation/*` |
| Session + tenant | `src/app/_layout.tsx`, `src/store/*Slice.ts` | The only place session state is reconstructed |
| Server data | `src/api/**` (RTK Query) | One `baseApi`; features inject endpoints |
| Realtime | `src/lib/chatSocket.ts`, `src/lib/aiSocket.ts` | Module singletons with listener registries, not React state |
| Theme | `src/global.css` | Every colour, radius and shadow. No inline hex in components |
| RN + `className` | `src/tw/**` | Plain RN components ignore `className` — always import from `@/tw` |

### Legacy still in the tree

[`src/lib/data.ts`](../src/lib/data.ts) and [`src/lib/role.ts`](../src/lib/role.ts)
hold pre-API fixtures (Unsplash images, a hardcoded `Coach Mike`). Four screens
still read from them for exercise demo media and accent colours. Treat them as
**deprecated**: don't add to them, and prefer the real payload when you touch a
call site.

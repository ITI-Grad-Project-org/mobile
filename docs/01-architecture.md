# 01 — Architecture

## The big picture in one sentence

CoachHub is **one app that shows two different interfaces** — a **Coach UI** and a **Client UI** — and which one you see is decided by **your role in the tenant you're currently in**.

That's the whole idea. The rest of this doc unpacks it.

---

## Part 1 — The two interfaces

The app has two completely separate "homes," each with its own bottom tab bar:

```
                    ┌─────────────────────────────┐
                    │      User opens the app      │
                    └──────────────┬──────────────┘
                                   │
                    role in the active tenant?
                                   │
                ┌──────────────────┴──────────────────┐
                │                                      │
          role = owner                            role = client
                │                                      │
                ▼                                      ▼
       ┌─────────────────┐                    ┌─────────────────┐
       │    COACH UI     │                    │    CLIENT UI    │
       │  (5 tabs)       │                    │  (5 tabs)       │
       └─────────────────┘                    └─────────────────┘
```

These are **not** the same screens with things hidden. They are two different tab bars, two different sets of screens, two different navigation trees. A coach never sees client tabs; a client never sees coach tabs.

### Coach UI — the tabs

This is what the coach (owner) sees. It's a business-management interface. **Six tabs:**

```
┌───────────────────────────────────────────────────────────────────┐
│                            COACH UI                                 │
├────────┬─────────┬────────┬────────┬─────────┬────────────────────┤
│  Home  │ Clients │ Plans  │   AI   │  Inbox  │      Profile       │
│   🏠   │   👥    │  🏋️    │   🤖   │   📨    │        👤          │
└────────┴─────────┴────────┴────────┴─────────┴────────────────────┘
```

| Tab | What's in it | Spec feature |
| --- | --- | --- |
| **Home** | Dashboard: active clients, adherence/compliance, engagement, churn-risk flags, quick actions | Analytics (§2F) |
| **Clients** | Roster (prospective/active/paused/archived), client profiles, intake, **private notes**, invites | CRM (§2A) |
| **Plans** | Exercise library, program builder, templates, assign a plan to a client | Training (§2B) |
| **AI** | Coach-mode AI (draft a plan, summarize progress, suggest adjustments) + manage the AI knowledge base | AI (§2E) |
| **Inbox** | All conversations across clients + broadcasts/announcements | Communication (§2D) |
| **Profile** | Business profile, logo, brand colors, **billing/plan**, account settings | Admin & Billing (§2G/§2H) |

> ⚠️ **Six tabs is at the edge of what a bottom tab bar holds comfortably.** iOS and Android bottom bars start to feel cramped past ~5 items (labels truncate, tap targets shrink, and iOS auto-collapses overflow into a "More" tab). This works, but see **"A note on the coach's six tabs"** below for two ways to keep it clean.

### Client UI — the tabs

This is what an invited trainee sees. It's a "follow my plan and track my progress" interface. **Five tabs:**

```
┌──────────────────────────────────────────────────────────┐
│                       CLIENT UI                           │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│  Today   │   Plan   │ Progress │ Messages │   Profile    │
│   🏠     │    📋    │    📈    │   💬     │     👤       │
└──────────┴──────────┴──────────┴──────────┴──────────────┘
```

| Tab | What's in it | Spec feature |
| --- | --- | --- |
| **Today** | Today's assigned workout, check-in due, announcements, quick log | Training + Check-ins |
| **Plan** | The assigned program, log sets/reps/weight/RPE | Training (§2B) + logging (§2C) |
| **Progress** | Body metrics, measurements, progress photos, PRs, personal charts | Progress (§2C/§2F) |
| **Messages** | 1:1 chat with the coach | Communication (§2D) |
| **Profile** | Account, personal info, preferences, the tenant switcher (if in multiple tenants) | Identity / settings |

The client sees **only their own data** — never other clients, never the coach's private notes.

> Where's the client's AI? The client-mode AI Q&A doesn't get its own tab in this layout — it's reachable from **Today** (an "Ask your coach's AI" entry point) and/or **Plan**. If you'd rather give clients a dedicated **AI** tab (matching the coach's), swap it in for one of the five — that's a clean choice too. Decide and record it in `AGENTS.md`.

---

## Part 2 — Why "role in the active tenant" decides the UI

This is the part that makes CoachHub different from a normal app, and it's worth slowing down on.

In a normal app, a person *is* one thing: a buyer, or a driver, or an admin. In CoachHub, **a person can be a coach in one place and a client in another, with the same login.**

Concrete example — meet Sara:

```
        Sara's single account
                 │
     ┌───────────┴────────────┐
     │                        │
  Tenant: "Sara's Gym"   Tenant: "Coach Mike's"
  role = owner           role = client
     │                        │
     ▼                        ▼
  COACH UI                CLIENT UI
```

Sara runs her own coaching business (she's the **owner** there → Coach UI). She's *also* being coached by Mike for her own training (she's a **client** there → Client UI). **Same app, same login, two different interfaces depending on which tenant she's looking at.**

So the question "which UI do I show?" is never "who is this user?" It's always **"who is this user *in the tenant they're currently viewing*?"**

### What "active tenant" means

Because a user can belong to several tenants, the app always tracks **one active tenant** — the one currently in focus. The active tenant determines:

1. **Which UI** (their role in *that* tenant → Coach or Client).
2. **Which data** (every screen shows data from *that* tenant only).

If a user belongs to just one tenant, it's auto-selected and they never think about it. If they belong to several (like Sara), they pick from a **tenant switcher**, and switching tenants can flip them from the Coach UI to the Client UI.

```
   Tenant switcher
   ┌─────────────────────────────┐
   │  ● Sara's Gym      (Coach)  │ ← tap → Coach UI
   │  ○ Coach Mike's    (Client) │ ← tap → Client UI
   └─────────────────────────────┘
```

---

## Part 3 — How this maps to folders and navigation

Now the practical part: how the two UIs live in code. We use **Expo Router** (file-based routing — the folder structure *is* the navigation).

```
app/
├── _layout.tsx                 # root: providers (store, theme), decides where to send you
│
├── (auth)/                     # NOT logged in
│   ├── sign-in.tsx
│   └── accept-invite.tsx
│
├── (onboarding)/               # logged in, but no active tenant yet
│   ├── tenant-switcher.tsx     # pick which tenant to enter
│   ├── accept-invite.tsx
│   └── create-tenant.tsx       # "become a coach"
│
├── (coach)/                    # ◀── COACH UI  (only mounted if role = owner)
│   ├── _layout.tsx             # the Coach tab bar (6 tabs)
│   ├── home.tsx                # Home (dashboard)
│   ├── clients/
│   │   ├── index.tsx           # roster
│   │   └── [clientId].tsx      # one client's profile
│   ├── plans/                  # Plans (program builder, library, templates)
│   ├── ai.tsx                  # AI (coach-mode + KB management)
│   ├── inbox/
│   │   ├── index.tsx           # all conversations + broadcasts
│   │   └── [clientId].tsx      # one conversation thread
│   └── profile.tsx             # Profile (business, branding, billing, settings)
│
└── (client)/                   # ◀── CLIENT UI  (only mounted if role = client)
    ├── _layout.tsx             # the Client tab bar (5 tabs)
    ├── today.tsx               # Today
    ├── plan/                   # Plan (assigned program + logging)
    ├── progress/               # Progress
    ├── messages.tsx            # Messages
    └── profile.tsx             # Profile (account, prefs, tenant switcher)
```

The two route groups `(coach)` and `(client)` are the two interfaces. Each has its own `_layout.tsx` that defines its tab bar. **Only one of them is ever mounted at a time**, based on role.

### The router decides which group to show

```tsx
// app/_layout.tsx  (simplified — the routing brain)
function RootLayout() {
  const { isSignedIn } = useAuth();
  const { tenantId, role } = useActiveTenant();   // role in the ACTIVE tenant

  if (!isSignedIn)            return <Redirect href="/(auth)/sign-in" />;
  if (!tenantId)             return <Redirect href="/(onboarding)/tenant-switcher" />;
  if (role === 'owner')      return <Redirect href="/(coach)/home" />;
  if (role === 'client')     return <Redirect href="/(client)/today" />;

  return <Redirect href="/(onboarding)/tenant-switcher" />;
}
```

Read it top to bottom like a bouncer at a door:

1. Not signed in? → sign-in screen.
2. Signed in but haven't picked a tenant? → tenant switcher.
3. You're an **owner** in this tenant? → **Coach UI**.
4. You're a **client** in this tenant? → **Client UI**.

When Sara switches from "Sara's Gym" to "Coach Mike's," `role` changes from `owner` to `client`, this code re-runs, and she's moved from the Coach UI to the Client UI automatically.

### The tab bars

Each UI's tab bar is just its `_layout.tsx`:

```tsx
// app/(coach)/_layout.tsx  — the Coach tab bar (6 tabs)
import { Tabs } from 'expo-router';

export default function CoachLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="home"     options={{ title: 'Home' }} />
      <Tabs.Screen name="clients"  options={{ title: 'Clients' }} />
      <Tabs.Screen name="plans"    options={{ title: 'Plans' }} />
      <Tabs.Screen name="ai"       options={{ title: 'AI' }} />
      <Tabs.Screen name="inbox"    options={{ title: 'Inbox' }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile' }} />
    </Tabs>
  );
}
```

```tsx
// app/(client)/_layout.tsx  — the Client tab bar (5 tabs)
import { Tabs } from 'expo-router';

export default function ClientLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="today"    options={{ title: 'Today' }} />
      <Tabs.Screen name="plan"     options={{ title: 'Plan' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile' }} />
    </Tabs>
  );
}
```

Two files, two tab bars. That's the entire "two UIs" mechanism.

---

## Part 4 — Where the screens' actual logic lives

Keep the `app/` files **thin**. A route file should import a screen and render it — nothing more:

```tsx
// app/(coach)/home.tsx
import { DashboardScreen } from '@/features/analytics/screens/DashboardScreen';
export default DashboardScreen;
```

The real code lives in feature folders, organized by feature (not by which UI uses it):

```
src/
├── features/
│   ├── clients/        # CRM        → used by Coach UI
│   ├── programs/       # training   → Coach builds, Client views
│   ├── checkins/       # logging    → mostly Client UI
│   ├── messaging/      # chat       → both UIs
│   ├── assistant/      # AI         → both UIs (different modes)
│   ├── analytics/      # dashboards → both (coach dashboard / client progress)
│   ├── memberships/    # tenants, switcher, the role logic
│   └── tenant-admin/   # settings, branding, billing → Coach UI
│
├── shared/
│   ├── ui/             # @expo/ui wrappers + NativeWind primitives
│   ├── hooks/          # useActiveTenant, useRole
│   └── components/     # Avatar, EmptyState, LoadingState, ...
│
└── store/              # Redux store + RTK Query (see doc 04)
```

Why organize by feature instead of by UI? Because some features (programs, messaging, AI) are **shared by both UIs** in different ways. The Coach *builds* a program; the Client *views* it — same `programs` feature, two entry points. Splitting by UI would duplicate that. (More in [doc 05](05-feature-modules.md).)

---

## Part 5 — Two rules to keep in your head

These come straight from the spec and they're easy to get wrong:

**Rule 1 — Everything is scoped to the active tenant.**
Every screen, in either UI, shows data from the active tenant *only*. A coach with two gyms sees one gym at a time; a client with two coaches sees one coach at a time. This is handled centrally in the data layer so you don't repeat it everywhere — see [doc 04](04-state-management.md).

**Rule 2 — The UI split is convenience, not security.**
Showing the Client UI to a client doesn't *protect* the coach's data — the **server** does that. Never assume "the client can't see this because there's no button for it." Anyone can poke the API directly, and the backend rejects unauthorized calls. The two-UI split is about giving each role the right *experience*, not about access control. (More in [doc 05](05-feature-modules.md).)

---

## A note on the coach's six tabs (worth deciding before you build)

You specified six coach tabs: **Home · Clients · Plans · AI · Inbox · Profile.** That's a complete, sensible set — but six is one past the point where a bottom tab bar stays comfortable, so it's worth a deliberate decision now rather than a redesign later.

**What actually happens at six tabs:**
- **iOS:** a native tab bar shows up to 5 items; a 6th triggers an automatic **"More" tab** that hides items behind a list. If you use `@expo/ui` / native tabs you may hit this; if you use a JS tab bar you control it, but six labels get tight on smaller phones.
- **Android:** Material guidance recommends **3–5** bottom-nav destinations; 6 is over the recommended max and labels start truncating.

**Three clean ways to handle it — pick one:**

- **Option A — Keep all six, custom tab bar.** Use a JS-rendered bottom bar (not the native 5-item one) so you control overflow, use icon-forward items with short labels, and test on a small device. Totally doable; just be intentional so iOS doesn't auto-collapse you into "More."
- **Option B — Fold Profile into Home (5 tabs).** Drop **Profile** as a tab and put it behind an avatar in the **Home** header (top-right) — a very common pattern. Tabs become **Home · Clients · Plans · AI · Inbox**. This is the lowest-friction option and what most production apps do.
- **Option C — Fold AI into Inbox or Home.** If the coach-mode AI is used less often than messaging, surface it inside another screen rather than as its own tab. Tabs become **Home · Clients · Plans · Inbox · Profile**.

**My recommendation: Option B.** Five tabs is the native sweet spot on both platforms, and "account/profile behind the avatar" is an established convention coaches will recognize instantly. But all three are fine — the point is to choose on purpose and write it in `AGENTS.md` so it doesn't drift between you and your teammate.

The client side is already at the comfortable five (**Today · Plan · Progress · Messages · Profile**), so no change needed there.

---

## The lifecycle a membership goes through

One last piece. A person's membership in a tenant isn't binary — it moves through states (this runs **per tenant**, so Sara can be `active` in her gym and `paused` under Mike at the same time):

```
invited ──accept──▶ active ──pause──▶ paused ──resume──▶ active
   │                   │                                   │
   └──decline──▶ gone  └──────────remove────────────▶ removed
```

The app reads the membership's `status` and reacts: `invited` shows the accept/decline screen; `active` shows the full UI for the role; `paused` shows a "paused by your coach" read-only state; `removed` makes the membership disappear from the user's tenant list. How this is stored is covered in [doc 04](04-state-management.md).
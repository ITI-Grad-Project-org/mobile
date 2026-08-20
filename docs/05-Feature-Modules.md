# 05 — Feature Modules

Each v1 feature from the spec maps to a module under `src/features/`. A module = its screens + components + hooks + RTK Query endpoints. This doc is the bridge from product spec to code structure — and from the two UIs ([doc 01](01-architecture.md)) to the code behind them. Everything here is **per active tenant** unless stated.

> **Roles in CoachHub are only `owner` (the coach) and `client`.** There is no assistant-coach role. Wherever this doc says "coach-side," it means `role === 'owner'`.

## A security note that applies to every module

The access matrix in the spec (who can do what) is enforced **on the server**. The client's job is to **reflect** it: show each role the right UI, hide what it can't use. **Hidden UI is never a security boundary** — assume any client can be tampered with, and let the API reject unauthorized calls. So: build the UI with `useRole()`, but never skip server-side checks "because the button isn't there." This keeps you honest and keeps the two devs from accidentally shipping a privilege-escalation bug. (This is the same "Rule 2" from [doc 01](01-architecture.md).)

## Role gating helper

Because the whole UI is already split into a Coach UI and a Client UI by role ([doc 01](01-architecture.md)), most "gating" is just *which route group you're in*. The hook is for the finer-grained checks inside a screen.

```ts
// src/shared/hooks/useRole.ts
export function useRole() {
  const { role } = useActiveTenant();   // role in the ACTIVE tenant
  return {
    role,
    isCoach: role === 'owner',    // the coach (owner) — Coach UI
    isClient: role === 'client',  // the trainee — Client UI
  };
}
```

---

## How modules map to the two UIs

A reminder of the layout from [doc 01](01-architecture.md), so you can see which module powers which tab:

| Coach UI tab | Module(s) | Client UI tab | Module(s) |
| --- | --- | --- | --- |
| **Home** | `analytics` | **Today** | `checkins`, `programs` |
| **Clients** | `clients` | **Plan** | `programs`, `checkins` |
| **Plans** | `programs` | **Progress** | `checkins`, `analytics` |
| **AI** | `assistant` | **Messages** | `messaging` |
| **Inbox** | `messaging` | **Profile** | `memberships`, account |
| **Profile** | `tenant-admin`, `billing` | | |

Modules are organized **by feature, not by UI**, because several features serve both UIs (the coach *builds* a plan in the Plans tab; the client *follows* it in the Plan tab — one `programs` module, two entry points).

---

## Module: `memberships` (foundation)

Not a "feature" in the spec, but the backbone of the two-UI architecture. Handles: fetching the user's 0..N memberships, the **tenant switcher**, accepting/declining invites, and the unaffiliated experience (create tenant / accept invite). Drives the role-based redirect in `app/_layout.tsx` and the lifecycle status handling. See [doc 04](04-state-management.md).

**Screens:** tenant switcher (`(onboarding)/tenant-switcher`), accept-invite, create-tenant ("become a coach"), unaffiliated landing. The tenant switcher is also surfaced inside the **Profile** tab of each UI for users who belong to multiple tenants.

---

## Module: `clients` (CRM) — *Coach UI: Clients tab*

Spec §2A. The coach's roster and client records.

- **Roster** with status filter: prospective, active, paused, archived. → FlashList.
- **Client profile** (`clients/[clientId]`): goals, baseline metrics, injuries/limitations, preferences, history.
- **Intake/onboarding questionnaire.**
- **Private coach notes** — coach only; **never** rendered for clients. Keep notes in a separate endpoint so they can't leak into a client-facing payload.
- **Invite** via email or link.
- **Archive/pause** clients (triggers the membership lifecycle on the server).

**Gating:** this module lives entirely in the Coach UI. Clients never reach it. The client's *own* profile editing lives in the Client UI **Profile** tab, not here.

---

## Module: `programs` (Plans) — *Coach builds · Client follows*

Spec §2B. This module powers the coach's **Plans** tab and the client's **Plan** tab — same data, two views.

**Coach side (Plans tab):**
- **Exercise library** (tenant-owned, optionally seeded). Long list → FlashList; consider an `@expo/ui` `BottomSheet` for the exercise picker.
- **Plan builder:** sets, reps, tempo, rest, supersets, basic periodization. Custom, data-dense UI → **RN + NativeWind**, with native control islands (steppers, pickers) from `@expo/ui`.
- **Templates** (reusable plans).
- **Assign a plan** to a client.

**Client side (Plan tab):**
- **View the assigned plan**, read-only (`◐`), and log against it (logging itself lives in `checkins`).

> The spec notes nutrition/diets will hang off training — but that's **v2**. Build the module so a future "nutrition" sibling is easy, but don't implement it now.

---

## Module: `checkins` (Progress & Check-ins) — *mostly Client UI*

Spec §2C. Powers the client's **Today**, **Plan**, and **Progress** tabs, and feeds the coach's review screens.

- **Client logs:** workouts (sets/reps/weight/RPE), body metrics, measurements, progress photos, PRs. This is the flow to make fast and offline-tolerant — optimistic logging (see [doc 04](04-state-management.md)). An RPE slider / weight stepper are good candidates for `@expo/ui` + `useNativeState`.
- **Progress photos:** upload via the new `expo-file-system` resumable upload API; display with `expo-image`.
- **Periodic check-in forms** (weekly/biweekly) — a segmented control (`@expo/ui`) fits the cadence selector. **Only clients complete check-ins** (matrix: coach is `✗` on "complete check-ins").
- **Review check-ins / progress** — surfaced on the coach side from inside a client's profile.
- **Progress charts** — fed by the analytics service; custom viz → NativeWind + a charting lib (Skia/victory-native). The client's personal progress view lives in the **Progress** tab.

---

## Module: `messaging` (Communication) — *Coach UI: Inbox · Client UI: Messages*

Spec §2D.

- **1:1 coach ↔ client messaging.** Custom chat UI → RN + NativeWind. Optimistic send.
- **Coach Inbox tab:** a unified list of all conversations across clients, plus **announcements / broadcast** to clients. Tapping a conversation opens the thread (`inbox/[clientId]`).
- **Client Messages tab:** the single 1:1 thread with their coach.
- **Notifications:** v1 is **email + in-app only**. Build in-app notification surfaces (a feed / badges) for: plan assigned, check-in due, new message, invite. **Push & SMS are v2 — do not integrate push in v1.** (Don't pull in `expo-notifications` push setup now.)

---

## Module: `assistant` (AI) — *Coach UI: AI tab · Client UI: from Today/Plan*

Spec §2E, §7. The differentiator. Full detail in [doc 06](06-Ai-Integration.md). Summary:

- **Client mode:** 24/7 Q&A grounded in the coach's per-tenant RAG knowledge base. **Both UIs have a dedicated AI tab** (this doc previously said the client reached it from Today/Plan — that is not the current layout).
- **Coach mode (AI tab):** ask about the library and corpus, or scope a question to one client's intake and check-ins by sending that client's `membershipId`. Retrieval covers **at most one client at a time** — roster-wide questions are not answerable by the assistant.
- **Knowledge base management:** upload/curate the tenant's AI content. **Coach only** — lives in the AI tab. Upload via the file-system upload API. Not yet built.
- **Delivery:** async over **socket.io** on the default namespace — `ai.requested` → `ai.accepted` (carries the `requestId`) → `ai.completed`, seconds apart. Not a REST job-ticket. Nothing is persisted, so a dropped socket loses the answer for good. The chat UI must show the pending state and fail pending asks on disconnect.
- **Not for unaffiliated users:** there's no KB to ground against before a membership exists, and the gateway rejects a tenant-less token at handshake. The client AI tab is hidden until they join a coach.

---

## Module: `analytics` (Dashboard) — *Coach UI: Home · Client UI: Progress*

Spec §2F.

- **Coach Home (dashboard):** active clients, adherence/compliance, engagement, churn-risk flags. Custom, visual → NativeWind + charts.
- **Per-client adherence trends** — surfaced on the coach side.
- **Client-side personal progress view** — the client's own data only (`◐`), in the **Progress** tab.

---

## Module: `tenant-admin` (Admin & Branding) — *Coach UI: Profile tab*

Spec §2G. **Coach (owner) only** — it's part of the Coach UI's Profile tab, which clients never see.

- **Business profile, logo, brand colors** (the per-tenant branding that themes the custom UI).
- **Team management** is **out of scope for v1** here — since there's no assistant role, the "manage team / assistants" capability from the spec's matrix doesn't apply to this build. (If you reintroduce assistants later, this is where it would live.)
- **Tenant settings.**

---

## Module: `billing` (Plans & Billing) — *Coach UI: Profile tab, concept-only in v1*

Spec §2H. **This is the subtle one — read carefully.** Lives in the coach's **Profile** tab.

- v1 ships the **plan/tier model + feature gating** in the data layer and UI. So you DO build: a representation of the tenant's subscription tier, and a `useFeatureGate(feature)` hook that hides/locks gated features.
- v1 does **NOT** ship live payment. **No Paymob integration, no card UI.** Show plan state and gated features; the actual upgrade/payment flow is deferred (v2).
- **Non-payment enforcement is TBD** in the spec — don't invent it. Build the gating mechanism but leave the lapse-policy as a server concern to be defined later.

```ts
// src/shared/hooks/useFeatureGate.ts  (concept-only enforcement in v1)
export function useFeatureGate(feature: GatedFeature) {
  const plan = useGetTenantPlanQuery(/* active tenant */);
  const allowed = plan.data?.features?.includes(feature) ?? false;
  return { allowed, isLoading: plan.isLoading };
}
```

> Careful with the word "plan" — it's overloaded here. **Subscription plan/tier** (this billing module) is different from a **training plan** (the `programs` module / the client's Plan tab). In code, prefer `subscriptionTier` for billing and `program`/`plan` for training to avoid confusion.

Managing the subscription is coach-only; feature *locks* may surface to clients too (a client can see a locked feature). Keep the gate data-driven so flipping a feature free/paid is a server config change, not a code change.

---

## What lives in `shared/`

Cross-cutting pieces every module reuses: the `@expo/ui` wrappers (`src/shared/ui`), app-wide components (Avatar, EmptyState, LoadingState, ErrorState), the hooks (`useActiveTenant`, `useRole`, `useFeatureGate`), formatters/validators, and the theme bridge (NativeWind config + per-tenant brand tokens).
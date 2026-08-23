# 05 — Feature Modules

A catalogue of every feature folder: what it renders, which endpoints it reads,
and the things that will surprise you. Use this to find where a change belongs
before you go looking in the tree.

Layout rules and the `shared/` policy are in
[`01-architecture.md §7`](01-architecture.md#7-feature-organisation).

---

## A security note that applies to every module

**RBAC is enforced server-side. Hidden UI is not a security boundary.** Every
"gate" below is a UX decision — showing a person the surface that fits their role.
Anyone can call the API directly, and the backend is what refuses. Never reason
"the client can't reach this because there's no button".

---

## Coach UI

### `coach/home` — the dashboard

**Route** `(coach)/(tabs)/home` · **Screen** `HomeScreen`

The most data-dense screen in the app, and the pattern the others copy.

| Piece | Source |
| --- | --- |
| Greeting, roster faces, membership→user id map | `useCoachHomeData` — `/coaches/me` + `/client` |
| Stat tiles, week activity, insights, attention queues | `useCoachHomeAnalytics` — `/analytics/overview`, `/analytics/attention`, `/analytics/activity` |
| Recent check-ins | `useRosterCheckins` |
| Avatars for analytics rows | `useClientAvatars` |
| Dismissed insight cards | `useDismissedInsights` (device-local) |

**Components** `StatTile` · `Sparkline` · `WeekActivityChart` · `AttentionRow` ·
`ActivityRow` · `InsightCard`

**`lib/`** `normalizeOverview` · `normalizeAttention` · `normalizeActivity` ·
`attentionQueues` · `format` · `fixtures`

Things to know:

- **Every analytics payload goes through a normaliser.** `/analytics/*` has no
  OpenAPI response schema, and each normaliser ships a `describe*Shape` dev-only
  logger that prints the payload once — that is how you find out what the server
  actually sent.
- **`attentionCounts` from `/overview` are computed at the default thresholds.**
  Render the badge from `overview` and the list from `/attention` *without* custom
  thresholds, or you get a badge saying 3 that opens a list of 5.
- **`EXPO_PUBLIC_HOME_FIXTURES`** (`all` / `clear` / `nulls`) renders the whole
  screen from `lib/fixtures.ts`. Dev-only — guarded by `__DEV__`, so it can never
  reach a release build.
- Attention rows deep-link out to `at-risk`, `check-ins`, `renewals` and `reviews`,
  which is why those screens re-use Home's normalisers and `useClientAvatars`
  rather than owning their own.

### `coach/clients` — the roster

**Route** `(coach)/(tabs)/clients` · **Screen** `ClientsScreen`

Reads `/client`, `/invitation` and `/join-requests`. Sheets and cards:
`ClientDetailSheet` · `ClientStatsCard` · `InviteClientSheet` · `InvitationCard` ·
`JoinRequestCard`. Per-client analytics come from `useClientAnalytics` +
`normalizeClientAnalytics`.

> **`clientId` vs `membershipId` is the bug factory here.** `/analytics/*` speaks
> in **membership** ids; `/client/{id}/measurements` and `/(coach)/chat/[id]` want
> the client's **user** id. `useCoachHomeData` exposes a `clientUserIds`
> `Map<membershipId, userId>` for exactly this. A 404 from a per-client route
> almost always means the wrong id kind, not a missing client.

### `coach/plans` — programs and nutrition plans

**Routes** `(coach)/(tabs)/plans`, `plans/training/[programId]`,
`plans/training/[programId]/days/[programDayId]`, `plans/nutrition/[planId]`,
`plans/nutrition/[planId]/days/[dayId]`

`useCoachPlans({ search, type, status })` merges
`/plans/training/client-programs` and `/plans/nutrition/client-plans` into one
normalised `CoachPlan[]` (see `lib/normalizePlan`), joins client names from
`/client`, and returns counts that ignore the active filters so the filter chips
can show totals.

**`lib/`** `normalizePlan` · `coachPlanDays` · `planCompleteness` · `macroSplit`

> **The app reads plans; the web dashboard authors them.** Every deep authoring
> action links out to `DASHBOARD_URL`, and when that env var is empty **every such
> link hides**. The endpoint modules expose the full builder API
> (`createProgram`, `addExerciseFromLibrary`, `replacePlannedSets`, …) and it is
> wired and typed — it is simply not surfaced in mobile UI yet.

Lifecycle for both domains: `draft → build days → publish → reschedule | cancel`,
with `unarchive` to restore. Days are **generated** from `startDate +
durationWeeks` — you `PATCH` a day, you never create one. Set and meal-item
replacement is `PUT` = *full replacement*: send every item you want to keep.

### `coach/inbox` — conversations

**Routes** `(coach)/(tabs)/inbox`, `(coach)/chat/[id]`
**Screens** `InboxScreen` · `ConversationScreen`

Thin over `features/shared/messaging`. The `[id]` param is the client's **user
id**. Full contract in [`10-chat-messaging.md`](10-chat-messaging.md).

### `coach/assistant` — AI, optionally client-scoped

**Route** `(coach)/(tabs)/ai` · **Screen** `AssistantScreen`

Adds `ClientScopePicker` over the shared assistant: picking a client sends
`membershipId`, which lets retrieval draw on that one client's intake and
check-ins. The membership is verified server-side on every message. Protocol in
[`06-Ai-Integration.md`](06-Ai-Integration.md).

### `coach/checkins` — the measurement review queue

**Routes** `(coach)/check-ins/index`, `(coach)/check-ins/[clientId]`

`useCheckinReviews` reads `GET /measurements/reviews/pending`;
`PATCH /measurements/{id}/review` is the only way a row leaves it.

> **Review state is server-side, not a device-local watermark**, and there is **no
> un-review route** — marking is one-way. The hook infers "reviewed" from *absence*
> in the pending list, so an empty or narrowly-scoped response would silently mark
> the whole tenant read. That is what `describePendingShape` exists to catch.
> `PENDING_PAGE_SIZE = 200`; `meta.total` still reports the true backlog.

`useRosterMeasurements` fans out per-client histories.
**Components** `CheckinEntryRow` · `StrengthProgressCard`.

### `coach/reviews` — what clients said

**Route** `(coach)/reviews` · `useCoachReviews` over `GET /reviews/me`

Responses are untyped, so everything goes through
`features/shared/reviews/lib/normalizeReviews`. `NEW_REVIEW_WINDOW_DAYS = 7` is how
long a review still earns a Home attention row; `lib/seenReviews` stores the local
"seen" watermark. **Components** `CoachReviewCard` · `RatingSummary`.

### `coach/at-risk` · `coach/renewals` · `coach/activity` · `coach/notifications`

Drill-downs off Home. `at-risk` and `renewals` both read `/analytics/attention`
and reuse Home's `normalizeAttention` + `useClientAvatars`; `renewals` opens the
web dashboard via `expo-web-browser` when `DASHBOARD_URL` is configured.
`activity` renders `/analytics/activity` grouped by day (`lib/groupByDay`,
`DayStrip`). `notifications` surfaces join requests and invitations.

> `/analytics/activity` is **not an audit trail** — rows disappear when a client
> un-logs. Never cache it as history or diff two fetches. Paginate with the date
> window, not an offset; `limit` is 1–200 and rejected outside that.

### `coach/profile-setup`

**Route** `(setup)/coach-profile`. A `SignupFlow` (see `shared/setup`) driven by
`config.ts`, mapped to the API by `mapping.ts`, saved by `useSaveCoachProfile`.

---

## Client UI

### `client/today` — the home screen

**Route** `(client)/(tabs)/today` · **Screen** `TodayScreen`

`useTodayData` resolves the **whole screen as one unit** — ten reads across four
features (training calendar + current program + day, nutrition, measurements,
activity graph, client profile, coach directory) behind a single `isLoading`,
`isFetching` and `refetchAll`. Before it existed, each section landed
independently and the screen reflowed five times per visit.

**Components** `StreakHero` (heat-map, `lib/activityGrid`) · `WorkoutCard` ·
`ExerciseSheet` · nutrition cards from `client/nutrition`. `useStreakCelebration`
fires the streak animation.

### `client/plan` · `client/program`

**Routes** `(client)/(tabs)/plan`, `(client)/program/[programId]`

Week-by-week view of the assigned program via `/client/me/training/programs` and
`/calendar`. `features/shared/plans/lib/` holds `activeProgram` (which of several
programs is the live one) and `programWeek` (week bucketing) — shared with the
coach side.

### `client/workout` — logging a session

**Route** `(client)/workout/[programDayId]` · **Screen** `WorkoutLogScreen`

The most interactive screen in the app: gesture-driven set cards, a rest timer
(`useRestTimer`), an exercise rail and a completion modal.

Flow: `POST …/days/{id}/log` (idempotent — starts *or resumes*) →
`PATCH …/logs/{logId}/sets/{setId}` per set → optional `extra-sets` →
`POST …/logs/{logId}/complete`.

> **The set outcome, not `/complete`, is what produces activity.** `completed` /
> `partial` adds a square to the heat-map, `skipped` removes one — and this can
> move while the workout is still `in_progress`. That is why `logSet`,
> `addExtraSet` and `removeExtraSet` all invalidate `Activity`.

`lib/units.ts` handles kg/lb; `draftToKg` / `draftFromKg` keep the wire format in
kg regardless of what is displayed.

### `client/nutrition`

**Routes** `(client)/nutrition/[dayId]`, `(client)/nutrition/plan/[planId]`, plus
cards embedded in Today.

Two logging modes in one screen: **prescribed meals** get an outcome
(`completed` / `partial` / `skipped`), and **actual foods** are added either from
the coach's library (`{ foodId, amount, mealSlot }`) or manually as raw totals.

**Components** `MealCard` · `MealDetailSheet` · `MealOutcomePicker` ·
`AddFoodSheet` · `LogPrescribedModal` · `LoggedFoodRow` · `MacroBar` ·
`TargetsCard` · `WaterCard` · `CompleteDayModal`

Gotchas, all real:

- `GET …/plans/current` can return **409** — two published plans cover today.
  Surface the conflict; do not render it as "no plan".
- `POST …/logs/{id}/complete` returns **409** while any planned meal is still
  awaiting an outcome.
- Adding a meal to a *fully flexible* day returns **409**.
- Targets arrive in nested bags (`targets` / `effectiveTargets` / `nutrients`),
  and the plans list is **not ordered** — sort by `schedulePhase`.

### `client/progress` — measurements

**Routes** `(client)/(tabs)/progress`, `(client)/measurement` (modal)

`ProgressScreen` reads `/client/me/measurements` (paginated: rows under **`docs`**,
counters under `meta` — always unwrap with `api/pagination`), renders `WeightChart`,
`MetricGrid` and progress photos. `MeasurementFormScreen` is a config-driven form
(`measurementForm.config.ts`) posting **multipart with flat fields** plus repeated
`photos` parts.

Shared derivations live in `features/shared/measurements/` (`metrics`, `stats`) so
the coach's check-in screens compute the same numbers.

### `client/chat` · `client/assistant`

Thin over the shared messaging and assistant layers. The client's thread is
implicit — there is no `clientId` param, the server resolves it from the token.

### `client/match-coach` · `client/coach-profile`

**Routes** `(setup)/match-coach`, `(setup)/intake`, `coach/[tenantId]`

Discovery (`/coaches/directory`) → public profile → join request
(`POST /client/me/join-requests`) → intake. `CoachProfileScreen` composes
`ProfileHero` · `ProofStrip` · `TransformationRail` · `SpecialtyChip` ·
`PackagesSheet` · `ReviewCard` · `ReviewFormSheet` · `StickyActionBar` ·
`PhotoViewer`, and is also where a client writes, edits or deletes their review.

> A review write must refresh the **public aggregate**, not just the client's own
> copy — hence the separate `CoachProfile` tag and the optimistic `foldRating`
> patch in `reviews.endpoints.ts`. See
> [`04-state-management.md §12`](04-state-management.md#12-optimistic-updates).

### `client/notifications` · `client/onboarding` · `client/profile-setup`

Invitation and join-request status cards; the first-run carousel; and the
client-side `SignupFlow` (`config.ts` + `mapping.ts`).

---

## Shared modules

### `shared/auth`

`AuthScreen` (login **and** signup, `RoleToggle` picks the persona) ·
`VerifyScreen` (OTP) · `ForgotPasswordScreen` · `ResetPasswordScreen` ·
`useGoogleAuth` · `utils/authError`.

After credentials succeed the screen: `saveTokens` → prime the tenant with a lazy
`/auth/me` or `/memberships` trigger → check `profileLooksComplete` → `setAuth` →
`router.replace` into the right group. Detail in
[`08-auth-and-tenancy.md`](08-auth-and-tenancy.md).

### `shared/messaging`

The **data layer only** — no screens. `types` · `cache` · `format` ·
`useChatRole` · `useChatEvents` · `useChatThread` · `useUnreadCount` ·
`components/MessageList`. Full doc: [`10-chat-messaging.md`](10-chat-messaging.md).

### `shared/assistant`

Also data-layer only, and deliberately **has no `api.ts`**: the assistant is
socket-only and persists nothing, so there is no cache to populate. `types` ·
`useAiChat` (`useAiEvents` + `useAiChat`) · `AiMarkdown` · `ThinkingLabel` ·
`AssistantComposer`. Full doc: [`06-Ai-Integration.md`](06-Ai-Integration.md).

### `shared/profile`

**One** `ProfileScreen` behind `/my-profile`, rendering a coach or client variant
from the persona. The client variant owns the **tenant switcher** (`useSwitchCoach`)
and links to the public coach page; both own logout and `DeleteAccountSheet`.

### `shared/setup` — the config-driven form engine

`SignupFlow` takes `Step[]`, each a list of `Field`s, and renders them one page at
a time with an animated progress bar, keyboard handling and a save state.

Field types: `text · email · tel · date · number · select · textarea · chips ·
url · image · images · certs · hours`, rendered by `FieldRenderer` →
`components/fields/*`. `UploadPersonaProvider` tells image fields which upload
bucket to write to.

Four screens are built on it: coach profile setup, client profile setup, client
intake, and the measurement form. **Adding a field is a config change, not a
component change** — extend the `Step[]` and the mapping.

### `shared/plans` · `shared/measurements` · `shared/reviews`

Pure derivation shared across both UIs: `activeProgram` / `programWeek`;
`metrics` / `stats`; `normalizeReviews` / `reviews` / `types`.

---

## Cross-cutting building blocks

### `src/shared/ui/`

`Surface` · `Card` · `Icon` · `GlassButton` · `StatCell` · `MetricGrid` ·
`SectionHeader` · `SectionTitle` · `Segmented` · `SegmentedControl` ·
`FilterPill` · `SearchField` · `AvatarStack` · `ProgressTrack` · `WeekProgress` ·
`WeekStepper` · `WeightChart` · `StarRating` · `PlanDetailHeader`.

Recipes and when to use which: [`11-design-system.md`](11-design-system.md).

### `src/shared/hooks/`

`useAuth` · `useActiveTenant` · `useRole` · `useSwitchCoach` ·
`useNativeTabsTheme` · `useSyncClientTimezone` · `useOnboarding` ·
`useProfileSetup`.

> **`useSyncClientTimezone`** is mounted once in the client layout and quietly
> matters: the activity graph dates every square in the timezone stored on the
> *client profile*, not the phone's. Unsent, the backend falls back to UTC — so a
> client in UTC+3 logging at 01:00 lands on the previous day's square and breaks
> their streak.

### `src/shared/utils/`

`date` · `dayProgress` · `name` · `color` · `cn` · `pct` · `query`
(`isPending` / `isHardError`) · `analyticsPayload`.

### `src/lib/`

`chatSocket` · `aiSocket` (the two singletons) · `utils` (`cn`) · `logState`
(reads a day's completion across the training/nutrition shape differences) ·
`plannedExercise` · `coach` (`resolveCoachFields` — coach payloads differ between
`/coaches/me`, the directory and the public profile) · `sfx` (a no-op stub) ·
`data` and `role` (**legacy fixtures — deprecated**, see
[`01-architecture.md §10`](01-architecture.md#10-where-the-seams-are)).

---

## Adding a feature — the checklist

1. Decide the UI: `coach/`, `client/`, or genuinely-shared code in `shared/`.
2. Create `screens/ · components/ · hooks/ · lib/` and an `index.ts` barrel.
3. Add endpoints to an existing `src/api/endpoints/*.endpoints.ts` (or a new one),
   taking `tenantId` in the args and tagging by tenant.
4. Write one hook that owns the screen's reads and returns
   `{ …data, isLoading, isFetching, isError, refetchAll }`.
5. Add the thin route file under `src/app/`, and register it in the group's
   `_layout.tsx` `Stack` if it is a pushed screen.
6. Handle **loading, error and empty** — all three.
7. `npm run typecheck && npm run lint`, then run it on iOS *and* Android.

# 13 — Conventions & Workflow

House style, where a new file belongs, and what "done" means in a repo with no
test suite.

---

## 1. Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Component / screen | `PascalCase` | `ClientDetailSheet`, `HomeScreen` |
| Hook | `useCamelCase` | `useCoachPlans`, `useActiveTenant` |
| RTK Query endpoint | `verbNoun` | `getClients`, `publishProgram`, `addExtraSet` |
| Endpoint module | `<domain>.endpoints.ts` | `measurements.endpoints.ts` |
| Slice | `<name>Slice.ts` | `activeTenantSlice.ts` |
| Pure helper | `camelCase.ts` | `normalizePlan.ts`, `attentionQueues.ts` |
| Route file | matches the URL segment | `check-ins/[clientId].tsx` |
| Feature folder | `kebab-case` | `coach-profile`, `profile-setup`, `at-risk` |

Screens belonging to exactly one UI are **unprefixed** — `coach/home/HomeScreen`,
not `CoachHomeScreen`. The folder already says which UI it is.

---

## 2. Where a new file goes

```
Is it a route?                     → src/app/<group>/…      (thin: import + render)
Does one UI own it?                → src/features/{coach,client}/<feature>/
Do both UIs genuinely reuse it?    → src/features/shared/<domain>/   (no screens
                                      unless the surface is literally identical)
Is it a reusable visual recipe?    → src/shared/ui/
Is it a cross-cutting hook?        → src/shared/hooks/
Is it a pure function?             → src/shared/utils/  or  <feature>/lib/
Does it talk to the server?        → src/api/endpoints/<domain>.endpoints.ts
Is it a colour / radius / shadow?  → src/global.css
```

Inside a feature:

```
<feature>/
├── screens/      one screen per file
├── components/   only used by this feature
├── hooks/        data assembly
├── lib/          pure functions — normalisers, formatters, derivations
└── index.ts      the barrel; the only thing outsiders import
```

**Import through the barrel.** A route imports `@/features/coach/plans`, never
`@/features/coach/plans/screens/PlansScreen`.

**Import through `@/`.** There are no `../../..` chains in this repo.

---

## 3. Code style

### TypeScript

- `strict: true`. **No `any` without a comment justifying it.** The justified case
  is an API response the backend documents no schema for — and then it goes
  through a normaliser (see [`09-data-layer.md §3`](09-data-layer.md#3-the-endpoint-modules)).
- Type what the server documents; normalise what it doesn't. A fabricated
  interface is a lie the compiler will enforce.
- Export the types a consumer needs from the barrel.

### React

- Function components only. React Compiler is on — reach for `useMemo` /
  `useCallback` when **identity** feeds a dependency array or a query arg, not as
  blanket optimisation.
- Hooks are unconditional and top-level, always.
- Effects should have an obvious owner. Anything app-wide (sockets, timezone sync)
  is mounted **once** in a layout, never in a screen.

### Comments

This codebase comments **why**, not what — and that convention is load-bearing.
Almost every sharp edge is recorded next to the code that handles it:

```ts
// The set outcome — not /complete — is the activity-producing request:
// completed/partial adds activity, skipped removes it. The heatmap can
// move while the workout is still in_progress.
'Activity',
```

When you fix a non-obvious bug, leave the reason where the next person will trip
over it. When you change such a line, **read the comment first** — it usually
records a bug that already happened once.

### No `console.log` in commits

`console.warn` / `console.error` for genuine problems is fine. Diagnostic logging
goes behind `__DEV__`, ideally as a once-only `describe*Shape` helper like the
existing ones.

---

## 4. Screen requirements

Every data screen handles **all three**:

| State | |
| --- | --- |
| Loading | A skeleton or spinner — one gate for the screen, not one per section |
| Error | A message plus a retry that calls the hook's `refetchAll` |
| Empty | A real empty state. "0 results" and "the request failed" must look different |

Plus:

- Pull-to-refresh (`RefreshControl` driven by `isFetching`) wherever the data can
  change server-side.
- `pb-tabbar` inside `(tabs)`, `pb-screen` on pushed screens.
- Accessibility labels on icon-only controls (`accessibilityLabel` on
  `GlassButton` / `Pressable`).

The pattern to copy is one hook per screen returning
`{ …data, isLoading, isFetching, isError, refetchAll }` — `useCoachHomeData`,
`useTodayData`, `useCoachPlans`.

---

## 5. Git & PRs

```bash
git checkout main && git pull
git checkout -b feature/<short-name>      # or fix/<short-name>
# … work …
npm run typecheck && npm run lint
git push -u origin feature/<short-name>
```

- Branch off `main`. `dev` is the current integration branch.
- Commit messages: `type: summary` (`feat:`, `fix:`, `refactor:`, `docs:`,
  `chore:`) matching the existing history.
- Keep `package-lock.json` in the commit whenever dependencies change.
- Re-run `npx expo prebuild` after native config changes and say so in the PR.

### PR description

State what changed, **which UI(s) it affects**, whether it needs a new dev build,
and what you verified on each platform. If a doc in `docs/` is now wrong, fix it
in the same PR.

---

## 6. Definition of done

A change is done when:

- [ ] `npm run typecheck` is clean
- [ ] `npm run lint` is clean
- [ ] It runs on **iOS and Android** in the dev build
- [ ] Loading, error and empty states all exist and were seen
- [ ] Light **and** dark mode were checked (half the tokens invert)
- [ ] Tenant-scoped reads take `tenantId` in their args and tag by tenant
- [ ] Role gating goes through `useRole()` / the active membership — never `persona`
- [ ] New mutations invalidate everything they affect, cross-domain included
- [ ] No `console.log`, no inline hex, no bare `react-native` imports of styled primitives
- [ ] Docs updated if behaviour or contracts changed

---

## 7. Things that will break the app quietly

Ranked by how much time they cost when they happen:

1. **Importing a styled primitive from `react-native`** instead of `@/tw` — no
   error, no style.
2. **Forgetting `tenantId` in query args** — two tenants share one cache entry and
   the second sees the first's data.
3. **Mutating without invalidating** — the screen stays stale until the cache
   expires. Cross-domain invalidation is easy to miss: a program write moves
   `Analytics`; a set outcome moves `Activity`.
4. **Adding an endpoint that 401s by design** — the reauth wrapper escalates it to
   a full logout.
5. **Mounting `useChatEvents` or `useAiEvents` in a screen** — a tab change then
   drops the reply, and for AI it is gone permanently.
6. **Persisting the assistant thread** — leaks one coach's knowledge base into
   another's session.
7. **Switching tenants without persisting the new tokens** — the UI updates, the
   data doesn't.
8. **`bg-gradient-*` in a component** — compiles to nothing; the card renders
   transparent.
9. **Reading a list without `unwrapList`** — the wrong envelope key returns `[]`
   with no error.
10. **Crossing `membershipId` and the client's user id** — a 404 that looks like a
    missing client.

---

## 8. Working with AI agents on this repo

`AGENTS.md` (loaded as `CLAUDE.md`) is the always-on context: the non-negotiable
rules, the project map, the commands. Keep it **short** — it is loaded into every
session, so detail belongs in `docs/` and the agent reads the relevant doc on
demand.

When you change an architectural rule, update `AGENTS.md` *and* the doc it points
at. Where the two disagree, the source code wins and both should be corrected.

Known drift to be aware of when reading older notes:

| Older claim | Reality |
| --- | --- |
| "Coach has 6 tabs including Profile" | 5 tabs; Profile is behind the header avatar at `/my-profile` |
| "Every call is scoped by the `x-tenant-id` header" | The header is sent, but the **JWT** is what the server reads |
| "Client invitations are live" | Gated behind `CLIENT_INVITATIONS_READY = false` |
| "UI-only prototype, no backend" | A full RTK Query data layer against the 3Keys API |

---

## 9. Documentation

- Docs live in `docs/`, indexed by [`docs/Readme.md`](Readme.md).
- Write against the code that exists, and link to it with relative paths so the
  link breaks when the file moves.
- Prefer recording **the reason** over restating the code. A doc that lists
  function signatures goes stale; a doc that explains why the tenant epoch exists
  stays useful.
- When the code and a doc disagree, the code wins — fix the doc in the same PR.

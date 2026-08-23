# UPLY Mobile — Engineering Documentation

> **Stack:** Expo SDK 56 · React Native 0.85 · React 19.2 · TypeScript 6 (strict) ·
> Development build (**not** Expo Go) · Expo Router · Redux Toolkit + RTK Query ·
> NativeWind v5 / Tailwind v4 · `@expo/ui` · socket.io v4
>
> This documents the **mobile client only**. The backend (`3Keys API`) is a separate
> service; its contract is mirrored in [`07-Uply-endpoints.md`](07-Uply-endpoints.md).

---

## Read this first

UPLY is **one app that renders two products**, chosen by the user's role in the
tenant currently in focus:

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
      ┌───────────────┐                     ┌───────────────┐
      │   COACH UI    │                     │   CLIENT UI   │
      │ src/app/(coach)│                    │src/app/(client)│
      └───────────────┘                     └───────────────┘
```

Only one route group is mounted at a time. A single login can be `owner` in one
tenant and `client` in another — so **nothing about a user is global**. Role,
status, plans, messages, measurements and AI grounding all belong to the *active
membership*.

---

## Documentation map

### Foundations

| Doc | What's in it |
| --- | --- |
| [`01-architecture.md`](01-architecture.md) | The two UIs, **persona vs role**, the real route tree, what `_layout.tsx` does at boot, tenant lifecycle |
| [`02-tech-stack.md`](02-tech-stack.md) | Every dependency and the reason for it, the version traps (NativeWind ↔ Reanimated ↔ worklets), Metro/Babel/TS config |
| [`12-getting-started.md`](12-getting-started.md) | Install, `.env`, prebuild, dev-client builds, EAS, troubleshooting |
| [`13-conventions.md`](13-conventions.md) | Naming, where a new file goes, PR workflow, definition of done |

### The data layer

| Doc | What's in it |
| --- | --- |
| [`04-state-management.md`](04-state-management.md) | The Redux store, the five slices, RTK Query patterns, the cache-tag catalogue |
| [`08-auth-and-tenancy.md`](08-auth-and-tenancy.md) | Two auth personas, token storage + refresh, tenant switching, the **tenant epoch** guard |
| [`09-data-layer.md`](09-data-layer.md) | `baseApi`, the 23 endpoint modules, the three multipart conventions, uploads, pagination, error handling |
| [`07-Uply-endpoints.md`](07-Uply-endpoints.md) | Backend reference: routes, DTOs, enums, status codes |

### The UI layer

| Doc | What's in it |
| --- | --- |
| [`11-design-system.md`](11-design-system.md) | `global.css` theme tokens, the `src/tw` wrappers, `Surface`/`Tone`/`Card`, dark mode, safe-area padding |
| [`03-Expo-ui-guide.md`](03-Expo-ui-guide.md) | `@expo/ui` usage, the `Host` boundary, when to use it instead of NativeWind |
| [`05-Feature-Modules.md`](05-Feature-Modules.md) | Every feature module: its screens, hooks, endpoints and gotchas |

### Real-time subsystems

| Doc | What's in it |
| --- | --- |
| [`06-Ai-Integration.md`](06-Ai-Integration.md) | The assistant: `ai.requested` → `ai.accepted` → `ai.completed`, correlation, failure rules, tenant isolation |
| [`10-chat-messaging.md`](10-chat-messaging.md) | Chat in full: data model, REST + socket contract, the socket singleton, cache design, hooks, invariants |

---

## The invariants

Break one of these and the app is wrong in a way tests won't catch.

1. **Per-tenant, not global.** There is no global `role`. Read it from the active
   membership via `useActiveTenant()` / `useRole()`. Memberships are normalised by
   `tenantId` in `membershipsSlice`.
2. **The JWT is what scopes a request.** `x-tenant-id` is sent by
   [`baseApi`](../src/api/baseApi.ts), but the server resolves the tenant from the
   token. A tenant switch is only real once the re-scoped tokens are persisted —
   see [`useSwitchCoach`](../src/shared/hooks/useSwitchCoach.ts).
3. **`tenantId` in a query arg is a cache key.** It is deliberately *not*
   forwarded as a query param on most endpoints. It exists so two tenants keep two
   caches.
4. **Tokens never enter Redux.** `expo-secure-store` holds `accessToken`,
   `refreshToken`, `persona`, `userEmail`, `activeTenantId`. Redux holds presence.
5. **RBAC is enforced server-side.** Hidden UI is a UX decision, never a security
   boundary.
6. **The AI assistant is async over a socket and persists nothing.** One
   un-acknowledged ask at a time. There is no REST fallback and no history.
7. **Chat is socket-first with a REST fallback.** Both paths must converge on the
   same cache entry.
8. **This is a development build.** Never write code that assumes Expo Go.
9. **Styling does not cross an `@expo/ui` `Host`.** Native controls get `@expo/ui`
   modifiers; brand UI gets `className`.
10. **Every data screen needs loading / error / empty states.** All three, every time.

---

## Where things live

| I want to… | Go to |
| --- | --- |
| Add a screen | `src/features/<ui>/<feature>/screens/`, then a thin route in `src/app/` |
| Add an API call | `src/api/endpoints/<domain>.endpoints.ts` (inject into `baseApi`) |
| Add a colour / radius / shadow | `src/global.css` — **never** an inline hex |
| Change the tab bars | `src/app/(coach)/(tabs)/_layout.tsx`, `src/app/(client)/(tabs)/_layout.tsx` |
| Touch auth or the tenant switch | `src/store/authSlice.ts`, `src/shared/hooks/useSwitchCoach.ts` |
| Touch chat | `src/features/shared/messaging/`, `src/lib/chatSocket.ts` |
| Touch the assistant | `src/features/shared/assistant/`, `src/lib/aiSocket.ts` |

---

## A note on accuracy

These docs are written against the code as it exists, and they call out the places
where the code disagrees with an older assumption — the coach tab count, the
`x-tenant-id` header, the client invitation routes. Where a doc and the source
disagree, **the source wins**; please fix the doc in the same PR.

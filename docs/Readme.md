# UPLY Mobile — React Native Client Documentation

> **Stack:** Expo SDK 56 · React Native 0.85 · React 19.2 · Development Build (not Expo Go) · `@expo/ui` (SwiftUI / Jetpack Compose) · NativeWind · Redux Toolkit + RTK Query
>
> **Companion to:** the product spec (v1 scope, LOCKED) and ADR v1. This documents the **mobile client only**. Backend is a separate service.

This is the engineering documentation for the CoachHub React Native app — a multi-tenant SaaS mobile client for fitness coaches and their clients.

## Documentation map

| Doc | What's in it |
| --- | --- |
| [`docs/01-architecture.md`](docs/01-architecture.md) | High-level architecture, folder structure, the per-tenant model, navigation |
| [`docs/02-tech-stack-decisions.md`](docs/02-tech-stack-decisions.md) | Why each library, the **NativeWind ↔ Reanimated version trap**, state-management decision (Redux vs Zustand) |
| [`docs/03-expo-ui-guide.md`](docs/03-expo-ui-guide.md) | How to use `@expo/ui`, when to reach for it vs RN+NativeWind, universal vs platform components |
| [`docs/04-state-management.md`](docs/04-state-management.md) | Redux Toolkit + RTK Query patterns, the tenant-scoped store, normalized memberships |
| [`docs/05-feature-modules.md`](docs/05-feature-modules.md) | How each v1 feature maps to a module: CRM, programming, check-ins, messaging, AI |
| [`docs/06-ai-assistant-integration.md`](docs/06-ai-assistant-integration.md) | The async job-ticket pattern, polling vs SSE, per-tenant RAG on the client side |
| [`docs/07-team-workflow.md`](docs/07-team-workflow.md) | Working with one teammate: git, branching, code ownership, conventions, PRs |
| [`docs/08-agents-and-ai-tooling.md`](docs/08-agents-and-ai-tooling.md) | **`AGENTS.md` / `CLAUDE.md` strategy to save tokens and get the most from AI** |
| [`docs/09-getting-started.md`](docs/09-getting-started.md) | First-run setup, dev build creation, environment, common commands |

## The one-paragraph summary

UPLY mobile is a **development-build Expo app** (Expo Go is not an option — `@expo/ui` native components and the dev client require it). It shows **two interfaces in one app** — a **Coach UI** and a **Client UI** — chosen by the user's **role in the active tenant** (`owner` → Coach UI, `client` → Client UI); the same login can be a coach in one tenant and a client in another. UI is built two ways: **`@expo/ui`** for anything that should feel like the OS (settings, sheets, pickers, forms), and **React Native primitives styled with NativeWind** for everything custom and branded. State lives in **Redux Toolkit**, with **RTK Query** owning all server communication and caching. The defining architectural rule from the spec: **the client lifecycle is per-tenant, not global** — a person can be a client of several coaches at once, so memberships are normalized by `tenantId` and the entire app is "tenant-aware" from the store up.

## Critical things to get right (read these first)

1. **This is a development build, period.** Don't write code or docs that assume Expo Go. See [getting started](docs/09-getting-started.md).
2. **Two UIs, chosen by role in the active tenant.** `owner` → Coach UI (Home · Clients · Plans · AI · Inbox · Profile); `client` → Client UI (Today · Plan · Progress · Messages · Profile). Only one is mounted at a time. Roles are only `owner` and `client` — **no assistant role.** See [architecture](docs/01-architecture.md).
3. **Per-tenant, not global.** Every piece of business data (plans, logs, messages, AI calls) is scoped to the *currently active tenant*. The store keys memberships by `tenantId`. See [architecture](docs/01-architecture.md) and [state](docs/04-state-management.md).
4. **The NativeWind / Reanimated version conflict is real and must be decided before you write UI.** See [tech-stack decisions](docs/02-tech-stack-decisions.md) — this is the single biggest setup risk.
5. **The AI assistant is async (job-ticket).** No request blocks on the model. See [AI integration](docs/06-ai-assistant-integration.md).
6. **RBAC is enforced server-side; the client only *reflects* it.** Never treat hidden UI as a security boundary. See [feature modules](docs/05-feature-modules.md).
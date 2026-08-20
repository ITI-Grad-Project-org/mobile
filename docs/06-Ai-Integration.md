# 06 — AI Assistant Integration (Client Side)

The AI assistant is UPLY's differentiator, and it has an unusual delivery model the
mobile app must handle correctly: **it's asynchronous, over a WebSocket**. This doc
covers the client side only — the RAG and model live on the backend.

> **This document was rewritten.** It previously described a REST job-ticket design
> (`POST /assistant/ask` → `jobId` → poll `GET /assistant/jobs/{id}`) taken from the
> spec's ADR D4. **That design was never built.** There are no `/assistant/*` REST
> routes. If you find code or docs referring to `AssistantJob`, `askAssistant`,
> `getJob`, `pollingInterval`, or a `status: 'pending'`, it is against the old
> design. The authority is the backend's own
> `docs/ai/frontend-websocket-integration.md` and `src/ai/ai.gateway.ts`.

## The transport

socket.io **v4**, on the **default namespace** (`/`).

```ts
import { io } from "socket.io-client";
const socket = io(BASE_URL, { auth: { token: accessToken }, transports: ["websocket"] });
```

`/chat` is a *different* gateway — the human coach⇄client messaging feature
(`src/lib/chatSocket.ts`). Different events, different rooms, nothing crosses over.
Emitting `ai.requested` at `/chat` does not error; it simply never answers. The two
singletons are deliberately kept as separate modules for this reason.

The token is the **access** token (`auth.token` on the handshake). A refresh token is
signed with a different secret and is rejected. A query-string token is ignored
outright — the server never looks there.

## The event contract

**client → server** — one event only:

| Event | Payload |
|---|---|
| `ai.requested` | `{ kind, prompt, membershipId?, clientId? }` |

**server → client:**

| Event | Payload | When |
|---|---|---|
| `ai.accepted` | `{ requestId }` | Queued. **This is where `requestId` comes from.** |
| `ai.completed` | `{ requestId, clientId, coachId, coachEmail, status, summary }` | The answer, or a recorded failure. |
| `ai.timed_out` | `{ requestId }` | No answer yet. **Advisory, not final.** |
| `ai.rejected` | `{ message }` | Malformed request. Socket stays open. |
| `ai.unauthorized` | `{ message }` | Bad/expired token. **Socket closes immediately after.** |
| `exception` | `{ statusCode, message, timestamp }` | Server-side throw, e.g. broker unreachable. |

There is **no acknowledgement callback**. `socket.emit('ai.requested', body, cb)` never
invokes `cb` — the reply is a separate event, typically seconds later.

## Where it lives in this app

| Concern | File |
|---|---|
| Socket singleton, auth retry, teardown | `src/lib/aiSocket.ts` |
| Wire + view-model types | `src/features/shared/assistant/types.ts` |
| Protocol rules — `useAiEvents` (root) + `useAiChat` (screens) | `src/features/shared/assistant/useAiChat.ts` |
| Thread state, tenant reset | `src/store/assistantSlice.ts` |
| Markdown rendering | `src/features/shared/assistant/components/AiMarkdown.tsx` |
| Coach screen + client scope picker | `src/features/coach/assistant/` |
| Client screen | `src/features/client/assistant/` |

**There is no `api.ts` and no RTK Query endpoint for the assistant chat**, contrary to
the usual convention in `AGENTS.md`. The path is socket-only and the backend persists
nothing, so there is no cache to populate and nothing to invalidate. Do not add an
`Assistant` tagType.

**`useAiEvents()` is mounted once, in `app/_layout.tsx`, next to `useChatEvents()` —
never in a screen.** The answer arrives seconds after the ask, so a handler owned by the
AI screen would be torn down by a tab change and the reply would be lost for good (rooms
don't survive, nothing is persisted, `busy` would strand at true). For the same reason
the in-flight id and the local timers are module-level in `useAiChat.ts` rather than
refs. Screens use `useAiChat()`, which only reads state and sends.

## The five rules that matter

1. **One un-acknowledged ask at a time.** `ai.rejected` and `exception` carry *no*
   `requestId` — the request never got one. With concurrent sends you cannot tell which
   ask a bare rejection refers to. Serialising makes correlation exact. This is what
   `busy` in `useAiChat` enforces, and it is also the only brake on a socket path with
   **no rate limiting** where every accepted request bills a Gemini call against a low
   free-tier daily ceiling.
2. **Never render a `failed` summary.** On `status: 'failed'`, `summary` is not an
   answer — it is the literal string `"AI request failed: <exception message>"`, an
   internal diagnostic that on a quota-exhausted day reads like
   `AI request failed: 429 RESOURCE_EXHAUSTED …`. Log it, show your own copy.
3. **`ai.timed_out` is not final.** It fires after `AI_REQUEST_TIMEOUT_MS` (120 s in
   full-stack compose, **30 s** in the core-api-only files). ai-service is still
   working and a late `ai.completed` still arrives. Treat it as "taking longer than
   expected". Our local give-up deadline is 180 s — deliberately above the server's.
4. **A reconnect permanently loses in-flight answers.** The reply is emitted to the
   room `ai:req:<requestId>`, and only the asking socket is in it. Rooms do not survive
   a reconnect. There is no endpoint to fetch the answer from — the free-text chat path
   stores nothing. So on `disconnect`, fail everything pending with a message the user
   can act on, and keep their prompt text.
5. **The token expires in 15 minutes and is re-verified on every message.** This is the
   most common cause of "the assistant just stopped working". `aiSocket.ts` handles
   `ai.unauthorized` by refreshing and reconnecting, with bounded retries.

## Who may ask about whom

| Asker | `membershipId` sent | What the answer can see |
|---|---|---|
| Coach | none | Their own library + curated corpus |
| Coach | a membership in their tenant | The above, **plus that one client's intake and check-ins** |
| Client | anything, or nothing | The corpus, plus their own material — always, only, themselves |

Checked against Postgres on **every** message; never trusted from the payload. A
membership from another tenant is `ai.rejected` with `"client not found in this tenant"`.

Consequences for the UI:

- The coach's `membershipId` comes from the roster (`getClients`; `client.id` is the
  membership id, same resolution as `ClientDetailSheet`). `ClientScopePicker` owns this.
- Retrieval covers **at most one client at a time**, so a roster-wide question ("which
  of my clients has a shoulder problem?") returns nothing useful. That belongs to a
  REST query over the database. There is deliberately no multi-select.
- A client's socket may send `membershipId` and it is **ignored**, not rejected. Do not
  build UI around it on the client side.
- `clientId` is metadata only — echoed back, grants no access.

## `kind`

Required, and **not an enum**: it is passed through and appears in the prompt as
`=== Request (kind: advice) ===`, nudging the model's register. Keep the vocabulary
small so answers stay consistent — this app sends `advice` throughout
(`AiRequestKind` in `types.ts`). Not to be confused with `PlanSuggestionKind`
(training/nutrition), which is a strict enum on the plan-suggestion REST API.

## Validation

Enforce client-side before emitting; it turns a round trip into an instant response:

- `prompt` non-empty after trim, and **≤ 4000 characters** (`MAX_PROMPT_LENGTH`).
- `kind` always sent.

## Tenant isolation

Retrieval is filtered by `tenantId` on the server, resolved **from the JWT** — a client
of Coach A can never retrieve Coach B's content. The client's responsibility is that a
stale tenant context never sends a request, and that an answer from the old tenant is
never on screen under the new one:

- `assistantSlice` resets to `initialState` on `setActiveTenant` / `clearActiveTenant`.
- `useSwitchCoach` calls `reconnectAiSocket()` after saving the re-scoped tokens — the
  live socket's JWT still names the old coach until it does.
- `forceLogout` (`baseApi.ts`) and both `ProfileScreen` sign-out paths call
  `disconnectAiSocket()`.

## Gating

A client's token carries `tenantId: null` until they join a coach, and the gateway
**rejects such a token at handshake** — there is no KB to ground against. The AI tab is
hidden in `app/(client)/(tabs)/_layout.tsx` while `tenantId` is null. Showing it anyway
produces an instant `ai.unauthorized` and a closed socket, which reads as a bug.

## Rendering

`summary` is Markdown-flavoured prose from Gemini, rendered through
`react-native-markdown-display` (`AiMarkdown`). The web guidance about sanitizing
before insertion does not apply here — React Native has no HTML sink. The real leak
risk is rule 2 above.

## Testing against a real backend

The backend repo ships a terminal client that speaks exactly this protocol — the
fastest way to tell whether a problem is yours or the server's:

```bash
cd services/core-api
npm run ai:chat -- --email <coach> --password <pw> --verbose --prompt "hello"
npm run ai:chat -- --email <coach> --password <pw> --clients   # list membershipIds
```

If the CLI gets an answer and the app does not, the difference is in the client.

Handshake failures surface as `connect_error`, **not** `ai.unauthorized`; the dev origin
must be in the server's `ALLOWED_ORIGINS`.

## Knowledge base management (coach only)

- Upload/curate the tenant's AI content (methodology, protocols, FAQs).
- Uploads use the `expo-file-system` upload API (progress, resumable) — KB docs can be
  large.
- Gate on `isCoach`. Not yet built.

## What's explicitly v2 (don't build)

- **Token streaming.** v1 is one `ai.completed` with the whole answer.
- **Agentic auto-actions** — auto-drafting without a prompt, auto-flagging at-risk
  clients. v1 is **prompt → answer**, nothing autonomous.
- **Durable AI history.** If you need answers that survive a restart, that is the
  plan-suggestion path (rows in `ai_plan_suggestions`, fetched over REST), not this one.

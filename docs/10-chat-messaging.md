# 10 — Chat / Messaging

Complete reference for the messaging feature: data model, server contract, socket
lifecycle, cache design, hooks, screens and the invariants that must not be
broken. Everything here is **per active tenant**.

> Placement follows AGENTS.md rule 2: messaging is the *same domain with a
> different screen per UI*, so the **screens are split per UI**
> (`features/coach/inbox`, `features/client/chat`) and only the **shared data
> layer** lives in `features/shared/messaging` — no screens there.

---

## 1. What the feature is

A one-to-one text thread between a coach (`role === 'owner'`) and one of their
clients, inside a single tenant.

- **Coach UI** — an *Inbox* tab listing every thread, opening into a per-client
  conversation.
- **Client UI** — a single *Chat* tab. A client is locked to its own thread with
  the coach who owns the active tenant; switching coaches switches threads.
- Live delivery over a socket, with typing indicators and read receipts.
- Everything degrades to REST when the socket is down.

Not in v1: attachments, images, voice notes, message editing/deletion, group
threads, push notifications, message search on the server.

**A conversation IS the `(tenant, client)` pair.** There is no conversation id —
a thread is addressed by the **client's** id. The coach names the client; the
client omits it entirely and the server derives it from the JWT.

---

## 2. File map

| Path | Role |
| --- | --- |
| [`src/api/endpoints/chat.endpoints.ts`](../src/api/endpoints/chat.endpoints.ts) | RTK Query endpoints, the single-entry-per-thread cache, `mergeMessages` |
| [`src/lib/chatSocket.ts`](../src/lib/chatSocket.ts) | The socket.io singleton: connect/teardown, auth recovery, `emitAck` |
| [`src/features/shared/messaging/types.ts`](../src/features/shared/messaging/types.ts) | `Message`, `ConversationSummary`, `SocketAck`, the chat gates |
| [`src/features/shared/messaging/cache.ts`](../src/features/shared/messaging/cache.ts) | Every write into a cached thread or the inbox list |
| [`src/features/shared/messaging/useChatRole.ts`](../src/features/shared/messaging/useChatRole.ts) | Which side of the conversation this session is on |
| [`src/features/shared/messaging/useChatEvents.ts`](../src/features/shared/messaging/useChatEvents.ts) | The app-wide socket listener (mounted once, in the root layout) |
| [`src/features/shared/messaging/useChatThread.ts`](../src/features/shared/messaging/useChatThread.ts) | Everything one thread screen needs, for either side |
| [`src/features/shared/messaging/useUnreadCount.ts`](../src/features/shared/messaging/useUnreadCount.ts) | Tab-badge count |
| [`src/features/shared/messaging/format.ts`](../src/features/shared/messaging/format.ts) | Timestamp/day-separator formatting |
| [`src/features/shared/messaging/components/MessageList.tsx`](../src/features/shared/messaging/components/MessageList.tsx) | The inverted `FlatList` thread, shared by both screens |
| [`src/features/shared/messaging/index.ts`](../src/features/shared/messaging/index.ts) | Data-layer barrel — **exports no screens** |
| [`src/features/coach/inbox/screens/InboxScreen.tsx`](../src/features/coach/inbox/screens/InboxScreen.tsx) | Coach thread list |
| [`src/features/coach/inbox/screens/ConversationScreen.tsx`](../src/features/coach/inbox/screens/ConversationScreen.tsx) | Coach thread |
| [`src/features/client/chat/screens/ChatScreen.tsx`](../src/features/client/chat/screens/ChatScreen.tsx) | Client thread |
| [`src/store/chatUiSlice.ts`](../src/store/chatUiSlice.ts) | Transient UI state: connectivity, typing, open thread |

Routes (thin, as always):

| Route file | Renders |
| --- | --- |
| [`src/app/(coach)/(tabs)/inbox.tsx`](../src/app/(coach)/(tabs)/inbox.tsx) | `InboxScreen` |
| [`src/app/(coach)/chat/[id].tsx`](../src/app/(coach)/chat/[id].tsx) | `ConversationScreen clientId={id}` — pushed **outside** the tabs, so the thread is full-screen |
| [`src/app/(client)/(tabs)/chat.tsx`](../src/app/(client)/(tabs)/chat.tsx) | `ChatScreen` |

Dependency: `socket.io-client ^4.8.3`.

---

## 3. Data model

```ts
type SenderType   = "coach" | "client";
type MessageStatus = "sending" | "failed";   // LOCAL ONLY — never sent by the server

interface Message {
  id: string;
  tenantId: string;
  clientId: string;         // identifies the thread
  senderType: SenderType;   // who wrote it
  body: string;
  readAt: string | null;    // ISO, or null while unread
  createdAt: string;        // ISO
  clientMsgId?: string;     // echoed to the SENDER only — used to reconcile
  status?: MessageStatus;   // present ⇒ this is an optimistic bubble
}

interface ConversationSummary {
  clientId: string;
  client: { id, firstName, lastName, avatarUrl } | null;
  status: "active" | "paused";
  lastMessage: Message | null;
  unreadCount: number;      // client messages the coach hasn't read
}

type SocketAck<T> = { ok: true; data?: T } | { ok: false; error: string };
```

Two deliberate decisions:

1. **Bubble ownership is decided by `senderType`, not by a user id.** A restored
   session has no real user id (`restoreSession` in `app/_layout.tsx` uses the
   placeholder `'restored-user'`), so comparing ids would be wrong. Each side
   computes its own `mySide` and compares against that.
2. **`status` is the only local-only field.** Its presence is the test for "this
   is an optimistic bubble that the server has not confirmed" — used by
   `mergeMessages`, the retry affordance and the delivery ticks.

---

## 4. Server contract

### REST — [`chat.endpoints.ts`](../src/api/endpoints/chat.endpoints.ts)

Every call is tenant-scoped by the `x-tenant-id` header set in
`baseApi.prepareHeaders`. `tenantId` is *also* passed in the query args, purely
so caches are keyed per tenant (house pattern).

| Side | Endpoint | Method + URL |
| --- | --- | --- |
| Coach | `getConversations` | `GET /chat/conversations` |
| Coach | `getMessages` | `GET /chat/conversations/:clientId/messages?before&limit` |
| Coach | `sendMessage` | `POST /chat/conversations/:clientId/messages` `{ body, clientMsgId? }` |
| Coach | `markRead` | `POST /chat/conversations/:clientId/read` |
| Client | `getMyMessages` | `GET /client/me/chat/messages?before&limit` |
| Client | `sendMyMessage` | `POST /client/me/chat/messages` `{ body, clientMsgId? }` |
| Client | `markMyRead` | `POST /client/me/chat/read` |

All three read endpoints normalise through **`unwrapList`** (`src/api/pagination.ts`)
like every other list read in the app — a bare array, or an envelope under
`docs` / `data` / `items` / `results` / `records`. They used to guess a single
key (`messages` / `conversations`) by hand, which silently yields `[]` for every
other shape: an empty inbox that reads as "no clients yet" rather than as a bug.

Tag types: `Conversations` (`LIST-${tenantId}`) and `Messages`
(`${tenantId}:${clientId}`, or `${tenantId}:me` for the client). **The send
mutations deliberately declare no `invalidatesTags`** — the caller patches the
thread cache with the response so the optimistic bubble reconciles without a
full refetch.

### Socket — namespace `/chat`

Same origin as REST (`EXPO_PUBLIC_API_URL`), `transports: ["websocket"]`, token
passed in the handshake `auth`.

**Emitted by the app**

| Event | Payload (coach) | Payload (client) | Ack |
| --- | --- | --- | --- |
| `conversation:join` | `{ clientId }` | *(not emitted — auto-joined)* | none |
| `conversation:leave` | `{ clientId }` | *(not emitted)* | none |
| `message:send` | `{ clientId, body, clientMsgId }` | `{ body, clientMsgId }` | `SocketAck<Message>` |
| `messages:read` | `{ clientId }` | `{}` | `SocketAck` |
| `typing` | `{ clientId, isTyping }` | `{ isTyping }` | none |

**Received by the app**

| Event | Payload | Handled in |
| --- | --- | --- |
| `message:new` | `Message` | `useChatEvents` → thread cache + inbox bump |
| `conversation:updated` | `{ clientId, lastMessage }` | `useChatEvents` → inbox bump (coach only) |
| `typing` | `{ clientId, isTyping }` | `useChatEvents` → `chatUi.typingByClientId` |
| `messages:read` | `{ clientId, reader, readAt }` | `useChatEvents` → flip our outbound `readAt` |
| `connect` / `disconnect` | — | connectivity fan-out |
| `error` / `connect_error` | error | auth recovery, *only* if it looks like auth |

> **The client must never send `clientId`.** It is locked to its own thread and
> the server derives the thread from the token. Sending one is at best ignored
> and at worst a cross-thread write attempt.

---

## 5. Transport strategy: socket-first, REST fallback

Every *write* tries the socket and falls back to REST. Reads are always REST; the
socket only patches what REST already loaded.

```
send / markRead
   ├─ socket connected? ── emitAck(event) ──┬─ ack.ok        → patch cache, done
   │                                        └─ ack.ok:false  → REFUSAL: mark failed, do NOT retry
   └─ throw (not connected / 8s ack timeout / dropped mid-flight)
                                            └─ REST mutation ─┬─ ok   → patch cache
                                                              └─ fail → mark failed
```

The distinction that matters: **a negative ack is a refusal, not a transport
failure.** Inactive relationship, empty body, not your client — REST would fail
identically, so retrying over REST just doubles the latency before the same
error. Only a *thrown* `emitAck` (no connection, no ack within
`ACK_TIMEOUT_MS = 8000`, or the socket dropping mid-flight) falls through.

---

## 6. The socket singleton — [`src/lib/chatSocket.ts`](../src/lib/chatSocket.ts)

One socket for the whole app. Module-level state:

| Variable | Meaning |
| --- | --- |
| `socket` | the current instance, or `null` |
| `connecting` | in-flight connect promise, so concurrent callers share one |
| `authRetries` | auth-rebuild attempts, capped at `MAX_AUTH_RETRIES = 3` |
| `recoveringAuth` | reentrancy guard — `error`, `connect_error` and `disconnect` all fire for one rejection |
| `authCooldown` | timer held while the budget is spent; `connectChatSocket` no-ops until it fires |
| `generation` | bumped by every explicit teardown, to invalidate superseded connects |

### Public API

```ts
connectChatSocket(): Promise<Socket | null>   // idempotent
disconnectChatSocket({ keepAuthState? }): void
reconnectChatSocket({ keepAuthState? }): Promise<Socket | null>
getChatSocket(): Socket | null
isChatConnected(): boolean
onChatConnectionChange(fn): () => void        // connect/disconnect fan-out
onChatSocketChange(fn): () => void            // the INSTANCE was replaced
emitAck<T>(event, payload): Promise<SocketAck<T>>
emitFireAndForget(event, payload): void
```

### `/chat` rejects AFTER the handshake — unlike the AI namespace

Verified against the live gateway. The two namespaces fail differently, and
every rule below follows from it:

| Namespace | A bad/absent token produces |
| --- | --- |
| `/` (AI) | `connect_error` at the handshake — the socket never connects |
| `/chat` | `connect`, then `error {"message":"Unauthorized"}`, then a server-side close (`disconnect("io server disconnect")`) |

Consequences:

1. **`connect` is not proof of anything on `/chat`** — a rejected attempt fires it
   too. `authRetries` is therefore cleared by a timer (`AUTH_SETTLE_MS = 4000`)
   that only counts a connection still up when it fires. Clearing on `connect`
   made the 3-attempt cap unreachable.
2. **socket.io never retries `"io server disconnect"`** (it deliberately treats a
   server-initiated close as final). That reason is routed into
   `handleAuthFailure()`; without it chat goes silently dead for the rest of the
   session while every REST screen keeps working.
3. `chatUi.connected` flickers true for the few ms before the kick. Harmless —
   `useChatThread` just re-emits `conversation:join` on the next connect.

### `connectChatSocket` is idempotent — and must stay that way

If an instance exists it is **reused**, even while it is still handshaking or
sitting between reconnect attempts (`socket.connect()` nudges an idle one).
socket.io owns its own retry loop; rebuilding here restarts the handshake.

This is load-bearing. `useChatEvents` re-runs and calls `connectChatSocket()`
again every time the singleton changes — and creating a socket *is* such a
change. Any code path here that tears down a not-yet-connected socket produces
an infinite connect→replace→re-subscribe→connect loop that never lands a
connection. (This was a real bug; see §14.)

### Token handling

- The handshake `auth` is a **callback**, not a frozen object: it re-reads
  `accessToken` from SecureStore on *every* connect attempt. `baseQueryWithReauth`
  may have rotated the token since construction, and socket.io would otherwise
  replay the dead one on every reconnect forever.
- **The socket refreshes the token itself from the second retry on** (via the
  shared single-flight `refreshAccessToken`). It has no 401 to hang a refresh
  off the way `baseQueryWithReauth` does, so a session restored from SecureStore
  with an expired access token used to leave chat permanently dead while every
  REST screen recovered silently. The first retry deliberately does *not*
  refresh — a server restart needs no new token, and REST may already have
  rotated one in.
- No token in SecureStore ⇒ `connectChatSocket` resolves `null` and no socket is
  created.

### Auth recovery

`error` and `connect_error` are matched against
`/unauthor|forbidden|token|jwt|auth|401|403/i`; `disconnect("io server
disconnect")` is treated as a rejection outright (see above).

- **Auth-shaped** → `handleAuthFailure()`: wait `2^(n-1)` seconds, refresh the
  token pair (attempts 2+), rebuild — up to `MAX_AUTH_RETRIES = 3`.
- **Budget spent, or the refresh itself fails** → `startAuthCooldown()`: tear
  down and stay down for `AUTH_COOLDOWN_MS = 60_000`, then start the whole budget
  over. The cooldown is not optional: tearing the socket down notifies
  `useChatEvents`, which re-runs and calls straight back into
  `connectChatSocket()` — so without it the give-up *is* the next attempt and the
  app hammers the gateway forever.
- **Anything else** (offline, DNS, a client-side drop) → left entirely to
  socket.io's own backoff (`reconnectionDelay` 1s → `reconnectionDelayMax` 10s).
  Hand-rolling a reconnect there *cancels* that backoff and fights it.

`handleAuthFailure`'s own rebuild passes `keepAuthState: true`. Every *other*
teardown (logout, tenant switch) is a fresh start and clears both the counter
and the cooldown — otherwise a re-login would sit out the remainder of the
previous session's cooldown.

### Teardown safety

`disconnectChatSocket()` bumps `generation`. A connect that started earlier
checks `generation` after its token read *and* again after construction, and
throws away the socket it built rather than installing it over the newer state.
Without that, a logout landing during a connect resurrects an authenticated
socket seconds later.

### `emitAck`

Rejects immediately if the socket isn't connected, on `ACK_TIMEOUT_MS`, or if
the socket disconnects while waiting (so the REST fallback fires at once instead
of after the full 8s). A `null`/missing ack resolves as
`{ ok: false, error: "empty acknowledgement" }` — a sloppy server can't crash the
caller. All listeners and timers are cleaned up on every exit path.

`emitFireAndForget` silently no-ops when disconnected. Used for typing and
join/leave, where a lost signal is harmless.

---

## 7. Cache design

### One cache entry per thread

Both message queries collapse *all pages* into a single entry:

```ts
serializeQueryArgs: ({ endpointName, queryArgs }) =>
  `${endpointName}(${tenantId}:${clientId})`,   // client side: `(${tenantId})`
merge: (currentCache, newItems) => mergeMessages(currentCache, newItems),
forceRefetch: forceOlderPage,
```

Why: the socket needs **one** place to patch. If `before`/`limit` spawned a new
entry per page, an incoming message would have to find and patch every page.

`data` is therefore always the whole loaded thread, **oldest → newest**.

### `forceOlderPage` — the ping-pong trap

Several components subscribe to the *same* entry with **different args**: the
open thread is paginating (`before` set) while the tab badge is not. A
`forceRefetch` that fires on any arg change lets those two bounce off each other
and refetch forever. So it only forces on a **defined** `before`:

```ts
Boolean(currentArg?.before) && currentArg?.before !== previousArg?.before
```

Corollary rule: **every subscriber to a thread cache passes the same
non-pagination args.** That's why `MESSAGES_PAGE_SIZE` is exported and used by
both `useChatThread` and `useUnreadCount`.

### `mergeMessages(existing, incoming)`

The single ordering + dedupe rule for every write:

1. Existing rows with a `status` (optimistic bubbles) are held aside, and only
   dropped when `incoming` echoes the same `clientMsgId`. A refetch must never
   make the user's just-sent message vanish.
2. Everything else is keyed by `id`, so `incoming` wins on conflict — the same
   row genuinely arrives twice (both parties get `message:new`, and REST sends
   also broadcast).
3. Sort by `createdAt` ascending, then append the surviving pending bubbles at
   the end (they're the newest by definition).

### Cache patchers — [`cache.ts`](../src/features/shared/messaging/cache.ts)

`patchThread` routes every write to whichever entry this role reads from
(`getMessages` keyed by `clientId` for the coach, `getMyMessages` for the
client), so no caller has to know which query it's touching.

| Function | Does |
| --- | --- |
| `upsertMessage` | insert or reconcile one message — replaces a pending bubble matching `clientMsgId`, ignores a duplicate `id`, otherwise splices in at the right chronological position |
| `removePendingMessage` | drop an optimistic bubble outright |
| `setPendingStatus` | flip a bubble `sending` → `failed` |
| `markOutboundRead` | after `messages:read`: stamp `readAt` on messages *not* sent by the reader (i.e. ours) |
| `markInboundRead` | after we mark read locally: stamp `readAt` on messages not sent by us |
| `bumpConversation` | coach inbox: set `lastMessage`, optionally `unreadCount += 1`, re-sort |
| `clearConversationUnread` | coach inbox: `unreadCount = 0` |

`bumpConversation` no-ops for an unknown `clientId` — a brand-new thread appears
on the next refetch rather than being fabricated from a partial payload.

`updateQueryData` on an entry nobody has loaded is a harmless no-op, which is
what makes it safe for `useChatEvents` to patch a thread the coach hasn't opened.

---

## 8. Hooks

### `useChatRole()`

Resolves which side of the conversation this session is on, from the **active
membership** — never a global role.

```ts
isCoach = role === "owner" || (role == null && persona === "coach");
mySide  = isCoach ? "coach" : "client";
canChat = isCoach || canChat(status);     // 'active' | 'paused'
```

The `persona` fallback covers the window before memberships land. **The coach is
not gated on their own membership status**: they own the tenant, no membership row
can revoke their messaging, and the synthesized coach membership is frequently
absent this early — gating on it locked every thread (§14). The coach's real gate
is per-thread (§9).

### `useChatEvents()` — mounted **once**, in [`app/_layout.tsx`](../src/app/_layout.tsx)

The app's only socket listener. It lives in the root layout, **not** on the chat
screens, because `conversation:updated` has to keep the coach's inbox rows and
tab badge live while they are on a completely different tab.

- Connects when `isAuthenticated && tenantId && canChat`; disconnects otherwise.
- Re-binds handlers when the socket instance is replaced. `onChatSocketChange`
  bumps an `epoch` state that is an effect dependency — handlers are bound to a
  specific `Socket`, so a tenant switch or forced re-auth must re-bind them.
- Mirrors connectivity into `chatUi.connected`.
- Reads the open thread through a ref (`openRef`) so a thread change doesn't
  re-subscribe the whole socket.
- Clears the open-thread pointer when the session goes inactive, so a stale
  `clientId` from the old tenant can't suppress badges in the new one.

**Unread counting.** `message:new` and `conversation:updated` can both describe
the same message, and *which* of them arrives depends on the room the coach is
in — so neither can be assumed to have handled it. Both handlers share a
`claimUnread(id)` set (capped at 300 ids): whichever event lands first owns the
increment, the second recognises the id and doesn't double count. An increment is
skipped entirely when the message is ours (`senderType === mySide`) or its thread
is the one on screen.

**Typing expiry.** A `typing: true` with no matching `false` (sender
backgrounded, socket dropped) would hang the indicator, so each key gets a
`TYPING_EXPIRY_MS = 6000` timer that clears it. Timers are keyed per thread and
all cleared on unmount.

### `useChatThread(clientId?, threadStatus?)`

Everything one thread screen needs, for either side. The coach passes the
client's id (and that client's relationship status); the client passes nothing.

Returns `{ messages, isLoading, isError, isFetching, refetch, loadEarlier,
hasEarlier, isLoadingEarlier, send, retry, notifyTyping, stopTyping, otherTyping,
connected, canChat, mySide }`.

**Gate.** `ready = Boolean(tenantId) && canChat && (!isCoach || Boolean(clientId))`
— everything below is inert until it holds.

**Pagination.** Walks backwards: `before` is the `createdAt` of the oldest held
message, `PAGE_SIZE = MESSAGES_PAGE_SIZE = 30`. "Reached the start" is inferred
from a load that merged nothing new — `sawFetch` waits for `isFetching` to
actually go true first, because it lags a render behind `setBefore`. Changing
thread or tenant resets the cursor **during render** (the `pagedThread` /
`threadKey` comparison), never in an effect, so one thread's cursor is never
painted against another's messages.

**Presence.** The coach emits `conversation:join` for the thread it opens and
`conversation:leave` on the way out, re-firing whenever `connected` flips back
true. The client is auto-joined on connect and joins nothing.

**Open-thread tracking.** `useFocusEffect` sets `chatUi.openClientId` to the
`clientId` (or the `CLIENT_THREAD = 'me'` sentinel) while the screen is focused,
and clears it on blur. That is what suppresses badge increments for the thread
you're looking at.

**Read receipts.** Driven by *focused* **and** *something inbound is unread*, not
by mount — so re-entering a fully-read thread emits nothing. Marking read tries
`messages:read` over the socket, falls back to the REST route (which marks and
broadcasts identically), then patches the thread and clears the inbox row's
unread count.

**Typing.** `notifyTyping()` is called on every keystroke but only emits on the
*edges*: `true` on the first keystroke, `false` after `TYPING_IDLE_MS = 2000` of
silence, on blur, on send, or on unmount. Guarded by a `typingSent` ref so
duplicate `true`s are never sent.

**Sending.** `send(raw)`:

1. trim; bail on empty or not-`ready`; stop the typing signal
2. mint a `clientMsgId` — `${base36 time}-${base36 random}`, because RN has no
   `crypto.randomUUID` and the id only has to be unique per device+thread
3. insert an optimistic bubble with `id: pending:${clientMsgId}` and
   `status: "sending"`
4. `deliver()` — socket, else REST (§5); on success the persisted row **replaces**
   the bubble, on failure it flips to `failed`

`deliver` re-tags the server's response with the `clientMsgId` it was sent with,
because the ack does not echo it — without that tag the persisted row would
arrive *alongside* the optimistic bubble instead of replacing it.

`retry(msg)` re-runs `deliver` with the same `clientMsgId`, so a retry can never
double-post: the server dedupes on it, and locally it lands on the same bubble.

### `useUnreadCount()`

The tab-badge count, read from the same caches the screens use — so the socket
patches in `useChatEvents` keep it live with **no extra polling**.

- Coach: sum of `unreadCount` across `getConversations`.
- Client: derived from the thread (`senderType !== mySide && !readAt`), because
  there is no count endpoint for that side. Passes
  `limit: MESSAGES_PAGE_SIZE` so its args match the chat screen's first page
  (§7).

---

## 9. Who is allowed to chat

Two independent gates, both in [`types.ts`](../src/features/shared/messaging/types.ts):

| Gate | Applies to | Rule |
| --- | --- | --- |
| `canChat(status)` | the **client's own** membership | `'active'` or `'paused'` only |
| `threadAllowsChat(status)` | the **coach's view of one client** | blocks only a *known* non-chattable status (`'invited'`, `'removed'`); anything absent or unrecognised is allowed |

`MembershipStatus` is `'invited' | 'active' | 'paused' | 'removed'`.

`threadAllowsChat` is deliberately permissive because the client record comes
back from `GET /client/:id` as a loose shape (`clientData.status ||
clientData.membershipStatus || client.status`) — a field we simply failed to
locate must not lock the composer. The server is the real gate.

**RBAC is server-side.** These gates only shape the UI; they are not security.

---

## 10. Screens and UI

### `InboxScreen` (coach)

`getConversations` — which already contains only active/paused relationships, so
it *is* the set of clients the coach can message. Local (client-side) search over
name + last-message preview. Own replies read `"You: …"`. Header shows the thread
count and total unread. Rows push `/(coach)/chat/[id]`. Full loading / error /
empty / no-search-results states.

### `ConversationScreen` (coach)

Header with the client's avatar, name and `status · email`, resolved from
`getClient` (which may return a plain client *or* a membership wrapping one).
Passes that status into `useChatThread` as the per-thread gate.

### `ChatScreen` (client)

Resolves the other party via `getDirectoryCoach(tenantId)` — the coach is the
owner of the active tenant. Shows a live connectivity dot
(`Typing… / Connected / Reconnecting…`). The inner `ChatThread` is **keyed by
tenantId**, so switching coaches throws away composer and pagination state rather
than carrying it into a different thread.

### `MessageList` (shared)

The one place in the app that uses `FlatList` rather than `ScrollView` + `.map()`
— pagination needs it.

- **`inverted`**: newest at the bottom; prepending an older page doesn't yank the
  viewport. Consequences to remember: the array is reversed, the
  chronologically-previous message is at `index + 1`, `onEndReached` means
  *scrolled to the top* (load earlier), `ListHeaderComponent` renders at the
  visual **bottom** (typing bubble) and `ListFooterComponent` at the **top**
  (older-page spinner).
- Consecutive messages from the same sender on the same day are *grouped* (tighter
  spacing, avatar only on the first).
- Day separators via `isNewDay` / `formatDayLabel`.
- Own bubbles show ticks — one for sent, two for read — and only once persisted.
- `sending` renders at 60% opacity; `failed` gets a destructive border and
  "Failed — tap to retry", the whole bubble being the retry target.
- `keyExtractor` prefers `clientMsgId` so a bubble keeps its identity when the
  persisted row replaces it.

### Composer (both screens)

Shared behaviour: send disabled while empty or not permitted, `sfx.send()` on
send, input cleared **before** the await (the optimistic bubble is the feedback),
placeholder switches to "Reconnecting…" when the socket is down — note the input
stays **enabled**, because REST fallback still delivers. Wrapped in
`KeyboardAvoidingView` and Liquid Glass where available
(`isLiquidGlassAvailable()`), with a bordered-card fallback.

> `sfx.send` is currently a **no-op stub** in `src/lib/sfx.ts`.

### `format.ts`

`formatMessageTime` (24h `H:MM`), `formatThreadTime` (time today → "Yesterday" →
weekday → `d MMM`), `formatDayLabel` (Today / Yesterday / weekday / full date),
`isNewDay`. All calendar-day comparisons go through a local `startOfDay`, so they
are day-boundary correct rather than "24 hours ago".

---

## 11. Transient UI state — [`chatUiSlice`](../src/store/chatUiSlice.ts)

```ts
{ connected: boolean, typingByClientId: Record<string, boolean>, openClientId: string | null }
```

Deliberately **not** in the RTK Query cache: none of it is server data, and
typing churn would re-render every message subscriber. Actions:
`setChatConnected` (also clears all typing — a dropped socket can't still be
typing), `setTyping`, `setOpenThread`, `clearChatUi`. `CLIENT_THREAD = 'me'` is
the single-thread sentinel for the client UI.

---

## 12. Lifecycle integration

| Event | What happens |
| --- | --- |
| **App start** | `restoreSession` reads token + persona + `activeTenantId` from SecureStore; `useChatEvents` connects once `isAuthenticated && tenantId && canChat` |
| **Login** | same path — the socket opens as soon as the membership resolves |
| **Token refresh (401)** | `baseQueryWithReauth` rotates the token in SecureStore; the socket picks it up on its next connect attempt via the `auth` callback |
| **Refresh fails → forced logout** | `forceLogout` in `baseApi.ts` calls `disconnectChatSocket()` (the socket holds its own copy of the now-dead token), then `clearAuth` + `clearChatUi` + `clearActiveTenant` + `clearMemberships` + `resetApiState` |
| **Manual logout** | `ProfileScreen` does the same sequence |
| **Tenant / coach switch** | `useSwitchCoach` saves the new tokens, calls `reconnectChatSocket()` **before** anything re-subscribes (the tenant is encoded in the JWT, so the old socket is scoped to the wrong tenant), then `setActiveTenant` and `resetApiState` |
| **Socket replaced** | `onChatSocketChange` → `epoch` bump → `useChatEvents` re-binds all handlers |

---

## 13. Invariants — do not break these

1. **`connectChatSocket` must stay idempotent.** Never tear down a live *or
   handshaking* socket inside it. → infinite connect loop.
2. **Only auth-shaped socket errors justify a manual rebuild.** Everything else is
   socket.io's backoff to own.
3. **The client never sends `clientId`.** Any emit or URL. The server derives it.
4. **One cache entry per thread; every socket patch goes through `cache.ts`.**
5. **Every subscriber to a thread cache passes identical non-pagination args**
   (`MESSAGES_PAGE_SIZE`), and `forceRefetch` only fires on a defined `before`.
6. **`useChatEvents` is mounted exactly once**, in the root layout. Mounting it
   per screen would multiply every cache patch and every unread increment.
7. **Unread increments are claimed by message id**, never assumed to belong to one
   event.
8. **`status` on a `Message` is local-only.** Never send it; its presence means
   "unconfirmed".
9. **The coach is never gated on their own membership status.**
10. **Tokens stay in SecureStore** — never AsyncStorage, never Redux.
11. **Tag caches by `tenantId`**; a thread cache belongs to exactly one tenant.

---

## 14. Bugs that were found and fixed here

Recorded because each was a *design* trap, not a typo — they will re-appear if
the reasoning is lost.

| Bug | Cause | Fix |
| --- | --- | --- |
| Socket never connected, CPU spun | `connectChatSocket` rebuilt any not-yet-`connected` socket; `useChatEvents` re-ran on every socket change → connect→replace→re-subscribe loop | reuse an existing instance unconditionally |
| Reconnect storms on flaky networks | every `connect_error` treated as an auth failure, hand-rolled reconnect cancelling socket.io's backoff | classify the error; rebuild only on auth |
| A bad token retried forever | `handleAuthFailure` → `reconnectChatSocket` → `disconnectChatSocket` zeroed `authRetries`, so the 3-attempt cap was unreachable | `keepAuthRetries` on the recovery path |
| Reconnects replayed a dead token | handshake `auth` froze the token at construction | `auth` callback re-reads SecureStore per attempt |
| Socket resurrected after logout | a teardown during an in-flight connect didn't cancel it | `generation` counter, checked twice |
| Coach's unread badge never moved | `conversation:updated` hard-coded `incrementUnread: false`, assuming `message:new` always arrives too — it only does for joined rooms | shared `claimUnread` id set |
| Endless refetch of the client thread | badge and chat screen subscribed to one cache entry with different args; `forceRefetch` fired on any change | force only on a defined `before`; share `MESSAGES_PAGE_SIZE` |
| Optimistic bubble vanished | `mergeMessages` dropped any `status` row lacking a `clientMsgId` | keep it until the server echoes the id |
| REST fallback waited a full 8s after the socket died | `emitAck` only had the ack timeout | also reject on `disconnect` |
| No real-time at all; REST kept working | `/chat` rejects *after* connect and closes server-side, which socket.io never retries — and `handleAuthFailure` rebuilt on the same expired token it had just been refused, while `connect` (which fires on a rejected attempt too) kept resetting the retry budget | route `"io server disconnect"` into recovery; refresh the token from retry 2; clear the budget from a settle timer, not from `connect` |
| Give-up looped instead of giving up | `disconnectChatSocket()` zeroed `authRetries` and notified `useChatEvents`, which immediately reconnected | `authCooldown` latch + `keepAuthState` |
| Thread replaced by "couldn't load" after loading fine | pages share one cache entry, so a failed *older-page* fetch flips `isError` for the whole thread | error state only when `messages.length === 0`; inline retry banner otherwise |
| "Messaging opens once this relationship is active" on active clients | `canChat` read the **coach's own** membership status, which is synthesized from `/coach/me` and often absent | coach ungated on own status; per-thread `threadAllowsChat` |

---

## 15. Unverified assumptions

Not yet confirmed against a live server — check these first when something looks
wrong on device:

- **What `clientId` on a `ConversationSummary` actually is.** The whole app
  assumes it is the client's USER id (`/(coach)/chat/[id]` is fed one from Home,
  Check-ins, Reviews and the plan screens too — see
  `useCoachHomeData.clientUserIds`). If `/chat/conversations` returned a
  *membership* id instead, `GET /chat/conversations/:clientId/messages` answers
  403 "No active relationship with client" and only the inbox route breaks.
  The thread's error state now prints the server's message, so the device says
  which it is.
- **Whether `before` / `limit` are read at all.** Neither is declared in the
  OpenAPI for either messages route, though 23 other routes do declare their
  query params — so paging may be a silent no-op server-side.
- The `conversation:updated` payload shape (`{ clientId, lastMessage }`).
- That acks really are `{ ok, data }` / `{ ok, error }` on every emit.
- Whether the server echoes `clientMsgId` on `message:new` to the sender (the
  code tolerates both, and re-tags ack responses defensively).
- Whether `message:new` reaches a coach who has **not** joined that conversation
  room. The `claimUnread` design is correct either way, but which event drives
  the badge depends on it.
- The exact key the client's relationship status arrives under from
  `GET /client/:id` — three fallbacks are tried.
- Whether the server dedupes `clientMsgId` on send. Retry correctness across a
  socket→REST fallback relies on it.

---

## 16. Manual test checklist

Both platforms, dev build:

- [ ] Coach and client on two devices: send both ways, message appears live.
- [ ] Airplane mode → send: bubble goes `sending` → `failed`; tap to retry after
      reconnect delivers exactly **one** copy.
- [ ] Kill the server mid-send: falls back to REST once it's back, no duplicate.
- [ ] Typing indicator appears, and disappears within ~6s if the sender
      backgrounds the app.
- [ ] Ticks: one on send, two once the other side opens the thread.
- [ ] Badge increments while the coach sits on another tab; does **not** increment
      for the thread that's on screen; clears on opening it.
- [ ] Scroll to the top of a long thread: older pages load once each, spinner at
      the top, viewport doesn't jump; stops at the real start.
- [ ] Switch coach (client side): the thread swaps, no messages leak across, the
      badge recounts.
- [ ] Logout: no socket traffic afterwards. Log back in: reconnects.
- [ ] Leave the app backgrounded for minutes, return: reconnects and backfills.
- [ ] An `invited` client's thread shows the banner instead of a composer.

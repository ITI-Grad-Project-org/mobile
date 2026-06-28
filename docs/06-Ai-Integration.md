# 06 — AI Assistant Integration (Client Side)

The AI assistant is UPLY's differentiator, and it has an unusual delivery model the mobile app must handle correctly: **it's asynchronous**. This doc covers the client side only — the RAG and model live on the backend.

## The job-ticket pattern (ADR D4)

A multi-second model + RAG call must not block a request. So the flow is:

```
1. App POSTs the question  ──▶  server returns { jobId }   (fast, returns immediately)
2. Server runs RAG + model in the background
3. App learns the answer is ready via:
     - poll  GET /assistant/jobs/{jobId}   (v1 default — simplest), OR
     - push/SSE/WebSocket  (the channel is a TBD in the spec — pick during build)
4. App fetches/receives the answer and renders it
```

The spec leaves the **result-delivery channel** (WebSocket vs SSE vs poll) as an open question to decide during build. **Recommendation for v1: start with polling.** It's the least infrastructure, works fine for a chat that already shows a "thinking" state, and you can upgrade to SSE/WebSocket later without changing the UI contract. Don't over-engineer the transport before you have the UX working.

## Client-side shape

Model an AI request as a ticket with a lifecycle, scoped to the active tenant:

```ts
type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

interface AssistantJob {
  jobId: string;
  tenantId: string;          // tenant-scoped, like everything else
  mode: 'client_qa' | 'coach_assist';
  prompt: string;
  status: JobStatus;
  answer?: string;
  error?: string;
}
```

RTK Query endpoints:

```ts
// src/features/assistant/api.ts
export const assistantApi = api.injectEndpoints({
  endpoints: (build) => ({
    askAssistant: build.mutation<{ jobId: string }, { mode: string; prompt: string }>({
      query: (body) => ({ url: 'assistant/ask', method: 'POST', body }),
    }),
    getJob: build.query<AssistantJob, string>({
      query: (jobId) => `assistant/jobs/${jobId}`,
    }),
  }),
});
```

Polling with RTK Query is built in — subscribe to `getJob` with `pollingInterval` while the status is pending/running, and stop once it's terminal:

```ts
const { data: job } = useGetJobQuery(jobId, {
  pollingInterval: job && (job.status === 'succeeded' || job.status === 'failed') ? 0 : 1500,
  skip: !jobId,
});
```

(When you move to SSE/WebSocket later, you keep this `AssistantJob` shape and just change how `status`/`answer` get updated — the UI doesn't care.)

## UX requirements

The async model **must** be visible and pleasant, not a frozen screen:

1. **Optimistic prompt echo** — show the user's question immediately in the thread.
2. **Pending state** — a clear "thinking" indicator while `pending`/`running`. This is where you set expectations; multi-second waits are normal here.
3. **Streaming-feel (optional, later)** — if you adopt SSE, you can stream tokens. Don't build this in v1; the job-ticket + spinner is the v1 contract.
4. **Failure handling** — `failed` jobs get a retry affordance. Network drops during polling should resume, not lose the ticket.
5. **Tenant switch cancels in-flight jobs** — if the user switches tenants, abandon old tenant's pending jobs so an answer from Coach A's KB never appears under Coach B. (Reset assistant state on `setActiveTenant`.)

## Grounding & isolation (why the app must stay tenant-correct)

Per spec §7 and ADR D8: retrieval is filtered by `tenantId` on the server — a client of Coach A can never retrieve Coach B's content. **The client's responsibility is to always send the correct active `tenantId`** (handled by the base-query header in [doc 04](04-state-management.md)). Never let a stale tenant context send an AI request — this is exactly why switching tenants must reset assistant jobs.

## Modes

- **Client mode (`client_qa`)** — conversational Q&A in the coach's method/voice. Available to clients and the coach. **Not** available to unaffiliated users — there's no KB to ground against before a membership exists (matrix `✗⁴`). Hide the assistant entirely in the unaffiliated experience.
- **Coach mode (`coach_assist`)** — plan drafting, progress summarization, adjustment suggestions. Coach only (the AI tab). These are longer-running and produce structured output (a draft plan, a summary) — render results into editable forms, not just chat bubbles.

## Knowledge base management (coach only)

- Upload/curate the tenant's AI content (methodology, protocols, FAQs).
- Uploads use the new `expo-file-system` upload API (progress, resumable) — KB docs can be large.
- The coach (owner) can curate; clients cannot. Gate on `isCoach`.

## What's explicitly v2 (don't build)

- **Agentic auto-actions** — auto-drafting and proposing without a prompt, auto-flagging at-risk clients. The spec defers all agentic behavior to v2. v1 is **prompt → answer**, nothing autonomous.
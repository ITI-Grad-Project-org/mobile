// Shared assistant data layer — used by both the coach AI (coach/assistant) and
// the client AI (client/assistant). Screens live per-UI; the async job-ticket
// flow (POST -> jobId -> poll) is identical for both, so it belongs here.
// See docs/06.

export type AssistantJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface AssistantJob {
  jobId: string;
  status: AssistantJobStatus;
  /** Populated once status === "succeeded". */
  result?: string;
}

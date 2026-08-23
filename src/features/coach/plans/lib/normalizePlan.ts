export type PlanKind = "training" | "nutrition";
export type PlanStatus = "draft" | "published" | "cancelled";
export type PlanPhase = "scheduled" | "active" | "ended";
/**
 * What the card actually shows. `isArchived` is a separate flag on the API, but
 * to a coach reading a list it reads as one more state alongside the status.
 */
export type PlanLifecycle = PlanStatus | "archived";

export interface PlanClient {
  /** The client's own id — what /(coach)/chat/[id] expects. Null when absent. */
  id: string | null;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  /** Membership status: active, paused, invited… */
  membershipStatus: string | null;
}

export interface CoachPlan {
  id: string;
  kind: PlanKind;
  name: string;
  description: string | null;
  status: PlanStatus;
  isArchived: boolean;
  /** status, or "archived" when the archive flag is set. */
  lifecycle: PlanLifecycle;
  schedulePhase: PlanPhase | null;
  goal: string | null;
  /** Training only. */
  difficulty: string | null;
  durationWeeks: number;
  startDate: string | null;
  endDate: string | null;
  membershipId: string | null;
  client: PlanClient | null;
  /** Nutrition only: the plan's daily macro targets, when it carries them. */
  targets: {
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
  } | null;
  /** "8 weeks · muscle gain · intermediate" — a one-line summary. */
  meta: string;
  /** Sort key: startDate, falling back to createdAt. */
  sortKey: number;
}

const STATUSES: PlanStatus[] = ["draft", "published", "cancelled"];
const PHASES: PlanPhase[] = ["scheduled", "active", "ended"];

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** "muscle gain" — enums arrive snake_cased and are shown as prose. */
export function humanize(value: unknown): string | null {
  const raw = str(value);
  return raw ? raw.replace(/_/g, " ") : null;
}

function statusOf(value: unknown): PlanStatus {
  const raw = str(value);
  return STATUSES.find((s) => s === raw) ?? "draft";
}

function phaseOf(value: unknown): PlanPhase | null {
  const raw = str(value);
  return PHASES.find((p) => p === raw) ?? null;
}

function timeOf(...values: unknown[]): number {
  for (const value of values) {
    const raw = str(value);
    if (!raw) continue;
    const ms = new Date(raw).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
}

/** "1,900" — kcal reads better grouped. */
export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

/**
 * The client behind a plan. Nutrition summaries embed `membership.client`;
 * training payloads are undocumented, so anything missing falls back to the
 * roster lookup the hook passes in.
 */
function clientOf(raw: any, fallback?: PlanClient | null): PlanClient | null {
  const membership = raw?.membership;
  const client = membership?.client;
  if (!client) return fallback ?? null;

  const name =
    [str(client.firstName), str(client.lastName)].filter(Boolean).join(" ") ||
    str(client.name) ||
    str(client.email) ||
    fallback?.name ||
    "Unnamed client";

  return {
    id: str(client.id) ?? fallback?.id ?? null,
    name,
    email: str(client.email) ?? fallback?.email ?? null,
    avatarUrl: str(client.avatarUrl) ?? fallback?.avatarUrl ?? null,
    membershipStatus: str(membership?.status) ?? fallback?.membershipStatus ?? null,
  };
}

function targetsOf(raw: any): CoachPlan["targets"] {
  if (!raw) return null;
  return {
    calories: num(raw.calories),
    proteinG: num(raw.proteinG),
    carbsG: num(raw.carbsG),
    fatG: num(raw.fatG),
  };
}

function metaOf(kind: PlanKind, raw: any, durationWeeks: number): string {
  const weeks = `${durationWeeks} ${durationWeeks === 1 ? "week" : "weeks"}`;

  if (kind === "training") {
    return [weeks, humanize(raw?.goal), humanize(raw?.difficulty)]
      .filter(Boolean)
      .join(" · ");
  }

  const targets = raw?.targets ?? {};
  const calories = num(targets.calories);
  const protein = num(targets.proteinG);
  return [
    calories !== null ? `${formatNumber(calories)} kcal` : null,
    protein !== null ? `${formatNumber(protein)}g protein` : null,
    weeks,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function normalizePlan(
  raw: any,
  kind: PlanKind,
  fallbackClient?: PlanClient | null
): CoachPlan | null {
  const id = str(raw?.id);
  if (!id) return null;

  const durationWeeks = num(raw?.durationWeeks) ?? 1;
  const status = statusOf(raw?.status);
  const isArchived = Boolean(raw?.isArchived);

  return {
    id,
    kind,
    name: str(raw?.name) ?? (kind === "training" ? "Training program" : "Nutrition plan"),
    description: str(raw?.description),
    status,
    isArchived,
    lifecycle: isArchived ? "archived" : status,
    schedulePhase: phaseOf(raw?.schedulePhase),
    goal: humanize(raw?.goal),
    difficulty: kind === "training" ? humanize(raw?.difficulty) : null,
    durationWeeks,
    startDate: str(raw?.startDate),
    endDate: str(raw?.endDate),
    membershipId: str(raw?.membershipId) ?? str(raw?.membership?.id),
    client: clientOf(raw, fallbackClient),
    targets: kind === "nutrition" ? targetsOf(raw?.targets) : null,
    meta: metaOf(kind, raw, durationWeeks),
    sortKey: timeOf(raw?.startDate, raw?.createdAt),
  };
}

/**
 * The coach's client roster keyed by membership id, so a plan whose payload
 * omits the embedded client can still say who it is for.
 */
export function buildClientIndex(rows: any[] | undefined): Map<string, PlanClient> {
  const index = new Map<string, PlanClient>();

  for (const row of rows ?? []) {
    // Roster rows are membership rows with the client nested — the same
    // `c.client ?? c` unwrapping the Clients screen does.
    const client = row?.client ?? row;
    const name =
      [str(client?.firstName), str(client?.lastName)].filter(Boolean).join(" ") ||
      str(client?.name) ||
      str(client?.email) ||
      "Unnamed client";

    const entry: PlanClient = {
      id: str(client?.id),
      name,
      email: str(client?.email),
      avatarUrl: str(client?.avatarUrl),
      membershipStatus: str(row?.status),
    };

    for (const key of [row?.id, row?.membershipId, row?.membership?.id]) {
      const id = str(key);
      if (id) index.set(id, entry);
    }
  }

  return index;
}

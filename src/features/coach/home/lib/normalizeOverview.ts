import type { CurrencyAmounts, Overview } from "@/api/types";

import { asNumber, asRecord, pickNumber } from "@/shared/utils/analyticsPayload";

/**
 * The overview payload, made safe to read.
 *
 * All three analytics responses turned out to be spelled differently from the
 * doc (`activityType`/`occurredAt` on the feed, `endsOn` on the attention
 * queue, and on this one: flat attention counts, `sessionsLogged`,
 * `byDay[].sessions`, `roster.mrrByCurrency`). Field access like
 * `overview.roster.active` doesn't just render blank if `roster` is absent —
 * it throws, taking the whole screen with it. So the shape is rebuilt here
 * with every branch present.
 */

function currencyMap(value: unknown): CurrencyAmounts {
  const record = asRecord(value);
  if (!record) return {};
  const out: CurrencyAmounts = {};
  for (const [code, amount] of Object.entries(record)) {
    const parsed = asNumber(amount);
    if (parsed !== undefined) out[code] = parsed;
  }
  return out;
}

/** A Pct stays null when absent: no denominator is not zero. */
function pct(record: Record<string, unknown> | undefined, paths: string[]): number | null {
  if (!record) return null;
  const value = pickNumber(record, paths);
  return value === undefined ? null : value;
}

export function normalizeOverview(raw: unknown): Overview | undefined {
  const root = asRecord(raw);
  if (!root) return undefined;

  const roster = asRecord(root.roster) ?? root;
  const week = asRecord(root.thisWeek) ?? asRecord(root.week);

  const byDayRaw = week?.byDay ?? week?.by_day;
  const byDay = (Array.isArray(byDayRaw) ? byDayRaw : []).map((item, i) => {
    const row = asRecord(item) ?? {};
    return {
      // Live responses use `dayOfWeek` (1 = Monday) and `sessions`. The count
      // is SESSIONS, not sets or tonnage — the endpoint has no tonnage figure
      // at all. The older spellings stay as insurance.
      weekday: pickNumber(row, ["dayOfWeek", "weekday", "day"]) ?? i + 1,
      sessions: pickNumber(row, ["sessions", "volume", "total", "value", "count"]) ?? 0,
    };
  });

  const active = pickNumber(roster, ["active", "activeClients"]) ?? 0;
  const paused = pickNumber(roster, ["paused", "pausedClients"]) ?? 0;

  return {
    roster: {
      // No `total` is sent — only a count per status. Invited and requested
      // aren't on the roster yet and archived has left it, so the total is
      // the two states that describe a current client.
      total: pickNumber(roster, ["total", "totalClients", "count"]) ?? active + paused,
      active,
      paused,
    },
    // MRR is nested under roster as `mrrByCurrency`, not a root-level `mrr`.
    mrr: currencyMap(roster.mrrByCurrency ?? root.mrr ?? root.monthlyRecurringRevenue),
    sessionAdherencePct: pct(root, ["sessionAdherencePct", "adherencePct"]),
    thisWeek: {
      sessionsLogged: pickNumber(week ?? {}, ["sessionsLogged", "volume", "total"]) ?? 0,
      previousWeekSessions: week
        ? (pickNumber(week, ["previousWeekSessions", "previousVolume", "prevVolume"]) ?? null)
        : null,
      changePct: pct(week, ["changePct", "changePercent"]),
      byDay,
    },
    // The counts are FLAT on the root (`clientsAtRisk`, `checkinsAwaitingReview`,
    // `programsEndingSoon`) — there is no `attentionCounts` object. Reading a
    // nested bag that never arrives is what made every badge 0 while the
    // /attention lists came back populated.
    attentionCounts: {
      atRisk: pickNumber(root, ["clientsAtRisk", "atRisk", "at_risk"]) ?? 0,
      checkinsAwaitingReview:
        pickNumber(root, ["checkinsAwaitingReview", "checkIns", "checkins"]) ?? 0,
      programsEndingSoon:
        pickNumber(root, ["programsEndingSoon", "programmesEndingSoon"]) ?? 0,
    },
  };
}

let described = false;

/** Prints the payload once, so these guesses can be replaced with field access. */
export function describeOverviewShape(raw: unknown): void {
  if (!__DEV__ || described || raw === undefined) return;
  described = true;
  const root = asRecord(raw);
  console.log("[overview] top-level keys:", root ? Object.keys(root).join(", ") : typeof raw);
  console.log("[overview] payload:", JSON.stringify(raw, null, 2));
}

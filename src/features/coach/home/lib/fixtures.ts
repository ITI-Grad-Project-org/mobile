import type { AnalyticsActivityRow, Attention, Overview } from "@/api/types";

/**
 * Dev-only payloads for walking the branches the API rarely produces on demand.
 *
 * The analytics response shapes are hand-written from the API doc — Swagger
 * documents the params but not the bodies — so at least one field name is
 * likely wrong until someone diffs these against a live response. Flip
 * USE_FIXTURES in useCoachHomeAnalytics to render every null path without the
 * network: null adherence (dash, no sparkline), null changePct (no delta chip),
 * null completionPct, a two-currency and an empty MRR map, an all-zero week,
 * and an unknown activity type.
 */

export const FIXTURE_OVERVIEW: Overview = {
  roster: { total: 18, active: 16, paused: 2 },
  mrr: { EGP: 42000, USD: 900 },
  sessionAdherencePct: 92.4,
  thisWeek: {
    sessionsLogged: 31,
    previousWeekSessions: 27,
    changePct: 14.8,
    byDay: [
      { weekday: 1, sessions: 5 },
      { weekday: 2, sessions: 7 },
      { weekday: 3, sessions: 0 },
      { weekday: 4, sessions: 6 },
      { weekday: 5, sessions: 8 },
      { weekday: 6, sessions: 3 },
      { weekday: 7, sessions: 2 },
    ],
  },
  // Deliberately equal to FIXTURE_ATTENTION's list lengths — a mismatch trips
  // the dev warning that guards against custom /attention thresholds.
  attentionCounts: { atRisk: 2, checkinsAwaitingReview: 1, programsEndingSoon: 1 },
};

/** Every Pct null, an empty MRR map, and a week with nothing logged. */
export const FIXTURE_OVERVIEW_NULLS: Overview = {
  roster: { total: 3, active: 3, paused: 0 },
  mrr: {},
  sessionAdherencePct: null,
  thisWeek: {
    sessionsLogged: 0,
    previousWeekSessions: null,
    changePct: null,
    byDay: [
      { weekday: 1, sessions: 0 },
      { weekday: 2, sessions: 0 },
      { weekday: 3, sessions: 0 },
      { weekday: 4, sessions: 0 },
      { weekday: 5, sessions: 0 },
      { weekday: 6, sessions: 0 },
      { weekday: 7, sessions: 0 },
    ],
  },
  attentionCounts: { atRisk: 0, checkinsAwaitingReview: 0, programsEndingSoon: 0 },
};

export const FIXTURE_ATTENTION: Attention = {
  atRisk: [
    { membershipId: "m-1", clientName: "Sarah Nabil", daysSilent: 11, neverActive: false },
    { membershipId: "m-2", clientName: "Omar Fathy", daysSilent: 9, neverActive: true },
  ],
  checkinsAwaitingReview: [
    {
      checkinId: "c-1",
      membershipId: "m-3",
      clientName: "Mia Adel",
      submittedAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    },
  ],
  programsEndingSoon: [
    {
      programId: "p-1",
      membershipId: "m-4",
      clientName: "Youssef Sami",
      programName: "12-Week Strength Base",
      endsOn: "2026-08-22",
      daysRemaining: 6,
      completionPct: null, // dash, not "0% done"
    },
  ],
};

/** All three queues empty — the single all-clear row, no action button. */
export const FIXTURE_ATTENTION_CLEAR: Attention = {
  atRisk: [],
  checkinsAwaitingReview: [],
  programsEndingSoon: [],
};

/** Mirrors the live shape: no id, no summary, `activityType`/`occurredAt`. */
export const FIXTURE_ACTIVITY: AnalyticsActivityRow[] = [
  {
    membershipId: "m-1",
    clientName: "Mia Adel",
    activityType: "workout_set_reported",
    occurredAt: new Date(Date.now() - 45 * 60_000).toISOString(),
    activityDate: "2026-08-15",
  },
  {
    membershipId: "m-3",
    clientName: "Youssef Sami",
    activityType: "meal_logged",
    occurredAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    activityDate: "2026-08-15",
  },
  {
    membershipId: "m-4",
    clientName: "Nada Hassan",
    activityType: "sleep_logged", // unknown kind — must degrade, not crash
    occurredAt: new Date(Date.now() - 26 * 3_600_000).toISOString(),
    activityDate: "2026-08-14",
  },
];

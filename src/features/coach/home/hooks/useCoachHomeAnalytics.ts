import {
  useGetAnalyticsActivityQuery,
  useGetAnalyticsOverviewQuery,
  useGetAttentionQuery,
} from "@/api/endpoints/analytics.endpoints";
import type { Attention, Overview } from "@/api/types";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { useCallback, useMemo } from "react";

import {
  FIXTURE_ACTIVITY,
  FIXTURE_ATTENTION,
  FIXTURE_ATTENTION_CLEAR,
  FIXTURE_OVERVIEW,
  FIXTURE_OVERVIEW_NULLS,
} from "../lib/fixtures";
import {
  describeActivityShape,
  normalizeActivityRow,
  toActivityRows,
  type ActivityRowView,
} from "../lib/normalizeActivity";
import { describeAttentionShape, normalizeAttention } from "../lib/normalizeAttention";

/**
 * Render Home from lib/fixtures instead of the network, so the states the API
 * won't produce on demand can actually be looked at. Set it in .env and restart
 * the bundler:
 *
 *   EXPO_PUBLIC_HOME_FIXTURES=all     all three attention queues populated
 *   EXPO_PUBLIC_HOME_FIXTURES=clear   every queue empty (the all-clear row)
 *   EXPO_PUBLIC_HOME_FIXTURES=nulls   null adherence / changePct / MRR, empty week
 *
 * Ignored outside __DEV__, so it can never reach a release build.
 */
const FIXTURE_MODE = __DEV__ ? process.env.EXPO_PUBLIC_HOME_FIXTURES : undefined;

/** How many activity rows Home shows. The endpoint accepts 1–200. */
const ACTIVITY_LIMIT = 5;

export interface CoachHomeAnalytics {
  overview?: Overview;
  attention?: Attention;
  activity: ActivityRowView[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

function fixtureFor(mode: string): Pick<CoachHomeAnalytics, "overview" | "attention" | "activity"> {
  if (mode === "clear") {
    return {
      overview: FIXTURE_OVERVIEW,
      attention: FIXTURE_ATTENTION_CLEAR,
      activity: [],
    };
  }
  if (mode === "nulls") {
    return {
      overview: FIXTURE_OVERVIEW_NULLS,
      attention: FIXTURE_ATTENTION_CLEAR,
      activity: FIXTURE_ACTIVITY.map(normalizeActivityRow),
    };
  }
  return {
    overview: FIXTURE_OVERVIEW,
    attention: FIXTURE_ATTENTION,
    activity: FIXTURE_ACTIVITY.map(normalizeActivityRow),
  };
}

export function useCoachHomeAnalytics(): CoachHomeAnalytics {
  const { tenantId } = useActiveTenant();
  const skip = { skip: !tenantId || !!FIXTURE_MODE };
  // tenantId is the RTK cache key only — analytics scopes every query by the
  // tenant in the JWT, and the endpoints strip it before building params.
  const arg = { tenantId: tenantId ?? "" };

  // No date window: the default (last 30 days) is what Home wants, and passing
  // one would change which week `thisWeek` describes.
  const overview = useGetAnalyticsOverviewQuery(arg, skip);
  // No thresholds. overview.attentionCounts is computed at the endpoint's
  // defaults, so passing a custom riskThresholdDays here would leave the badge
  // saying 3 while the list below it shows 5.
  const attention = useGetAttentionQuery(arg, skip);
  const activity = useGetAnalyticsActivityQuery({ ...arg, limit: ACTIVITY_LIMIT }, skip);

  const rows = useMemo(() => {
    // The response body isn't in Swagger — log the real shape once so the
    // guesswork in normalizeActivity can be replaced with field access.
    describeActivityShape(activity.data ?? []);
    return toActivityRows(activity.data);
  }, [activity.data]);

  // Same treatment: a queue the API spells differently would otherwise render
  // as "No check-ins waiting", which is a confident wrong answer.
  const queues = useMemo(() => {
    describeAttentionShape(attention.data);
    return normalizeAttention(attention.data);
  }, [attention.data]);

  const refetch = useCallback(() => {
    if (!tenantId) return;
    overview.refetch();
    attention.refetch();
    activity.refetch();
    // Refetch identities are stable per query, so this only re-creates when the
    // tenant changes — which is exactly when the caches change too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  if (FIXTURE_MODE) {
    return {
      ...fixtureFor(FIXTURE_MODE),
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: () => {},
    };
  }

  return {
    overview: overview.data,
    attention: queues,
    activity: rows,
    // No tenant means every query is skipped, so the empty values below are
    // placeholders rather than answers — report that as loading.
    isLoading: !tenantId || overview.isLoading || attention.isLoading || activity.isLoading,
    isFetching: overview.isFetching || attention.isFetching || activity.isFetching,
    // There is deliberately NO `error.status === 404` branch anywhere in this
    // feature. A 404 here means the tenant scoping is wrong, and swallowing it
    // into an empty state would hide that behind "this coach has no clients".
    isError: overview.isError || attention.isError || activity.isError,
    refetch,
  };
}

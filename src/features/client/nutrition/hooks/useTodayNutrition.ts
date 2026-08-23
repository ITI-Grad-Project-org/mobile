import {
  useGetCurrentNutritionPlanQuery,
  useGetMyNutritionPlanQuery,
  useGetNutritionCalendarQuery,
  useGetNutritionDayQuery,
  useGetNutritionLogQuery,
} from "@/api/endpoints/nutrition.endpoints";
import type { NutritionTargets } from "@/api/types";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { todayIso } from "@/shared/utils/dayProgress";
import { isPending } from "@/shared/utils/query";
import { useCallback, useMemo } from "react";
import {
  calendarDayId,
  calendarLogId,
  consumedMacros,
  EMPTY_MACROS,
  isConflict,
  isoDate,
  normalizeDay,
  normalizeLog,
  planDayDate,
  planDayList,
  readLogId,
  unwrap,
  unwrapList,
  type Macros,
} from "../data";

export interface TodayNutrition {
  /** Null when today isn't covered by a published plan. */
  dayId: string | null;
  targets: NutritionTargets;
  consumed: Macros;
  waterMl: number;
  hasPlan: boolean;
  isLoading: boolean;
  /** A refresh is in flight over data that's already on screen. */
  isFetching: boolean;
  /** Excludes the 409 two-overlapping-plans case, which degrades to "no plan". */
  isError: boolean;
  refetch: () => void;
}

export function useTodayNutrition(): TodayNutrition {
  const iso = todayIso();
  // Cache-keyed by tenant so a coach switch can't leave the old coach's plan
  // and totals on today's cards.
  const { tenantId } = useActiveTenant();

  const planQuery = useGetCurrentNutritionPlanQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );
  const { data: planData, error: planError } = planQuery;

  const calendarQuery = useGetNutritionCalendarQuery(
    { tenantId: tenantId ?? "", from: iso, to: iso },
    { skip: !tenantId }
  );
  const calendarData = calendarQuery.data;

  const row = useMemo(() => unwrapList(calendarData)[0] ?? null, [calendarData]);

  // A 409 here means two published plans overlap today. Today's cards degrade to
  // "no plan" rather than surfacing the conflict — the Plan tab explains it.
  const plan = useMemo(
    () => (planError && isConflict(planError) ? null : unwrap(planData)),
    [planData, planError]
  );

  // The calendar is the cheap way to find today's day, but it can stop listing
  // it (a finished day drops out of some ranges), which would blank today's
  // targets and totals for the rest of the day. The plan always covers today, so
  // fall back to it — fetched in full only when the calendar came up empty, and
  // usually already cached by the Nutrition tab.
  const fullPlanQuery = useGetMyNutritionPlanQuery(
    { tenantId: tenantId ?? "", planId: plan?.id ?? "" },
    { skip: Boolean(row) || !tenantId || !plan?.id }
  );
  const fullPlanData = fullPlanQuery.data;

  const fullPlan = useMemo(() => unwrap(fullPlanData) ?? plan, [fullPlanData, plan]);

  const planFallbackDay = useMemo(() => {
    if (row || !fullPlan) return null;
    return (
      planDayList(fullPlan).find((day: any) => {
        const date = isoDate(day?.date ?? day?.scheduledDate) ?? planDayDate(fullPlan, day);
        return date === iso;
      }) ?? null
    );
  }, [row, fullPlan, iso]);

  const dayId: string | null = useMemo(
    () => calendarDayId(row) ?? calendarDayId(planFallbackDay),
    [row, planFallbackDay]
  );

  // The calendar row carries the log only once the client has started one.
  const rowLogId: string | null = useMemo(() => calendarLogId(row), [row]);

  const dayQuery = useGetNutritionDayQuery(
    { tenantId: tenantId ?? "", dayId: dayId ?? "" },
    { skip: !tenantId || !dayId }
  );
  const dayData = dayQuery.data;

  // Once the day is finished the calendar row can stop carrying the log, which
  // would read as today's calories and water resetting to zero. The day payload
  // is already loaded, so falling back to it costs no extra request.
  const logId: string | null = useMemo(
    () => rowLogId ?? readLogId(dayData),
    [rowLogId, dayData]
  );

  const logQuery = useGetNutritionLogQuery(
    { tenantId: tenantId ?? "", logId: logId ?? "" },
    { skip: !tenantId || !logId }
  );
  const logData = logQuery.data;

  const day = useMemo(
    () => (dayId ? normalizeDay(dayData ?? row ?? planFallbackDay, fullPlan, iso, dayId) : null),
    [dayId, dayData, row, planFallbackDay, fullPlan, iso]
  );

  const log = useMemo(() => normalizeLog(logData), [logData]);

  const consumed = useMemo(
    () => (log ? consumedMacros(log, logData) : EMPTY_MACROS),
    [log, logData]
  );

  const refetch = useCallback(() => {
    if (!tenantId) return;
    planQuery.refetch();
    calendarQuery.refetch();
    // Skipped queries can't be refetched — each one refetches itself once its
    // argument arrives from the read above it in the chain.
    if (!row && plan?.id) fullPlanQuery.refetch();
    if (dayId) dayQuery.refetch();
    if (logId) logQuery.refetch();
    // Refetch identities are stable per query, so this only re-creates when the
    // tenant or a chained id changes — which is when the caches change too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, row, plan?.id, dayId, logId]);

  // Each of these is skipped until the read before it answers. isPending counts
  // "un-skipped but not started yet" as loading — without that the chain reports
  // ready for a frame between every link, which is what made the nutrition cards
  // blink in a beat after the rest of Today.
  const chainPending =
    isPending(fullPlanQuery, !row && Boolean(plan?.id)) ||
    isPending(dayQuery, Boolean(dayId)) ||
    isPending(logQuery, Boolean(logId));

  return {
    dayId,
    targets: day?.targets ?? {},
    consumed,
    waterMl: log?.waterMlConsumed ?? 0,
    hasPlan: Boolean(day),
    isLoading: planQuery.isLoading || calendarQuery.isLoading || chainPending,
    isFetching:
      planQuery.isFetching ||
      calendarQuery.isFetching ||
      fullPlanQuery.isFetching ||
      dayQuery.isFetching ||
      logQuery.isFetching,
    // The 409 is deliberately not an error here: two overlapping published plans
    // read as "no plan" on Today, and the Plan tab is where that gets explained.
    isError:
      (planQuery.isError && !isConflict(planError)) ||
      calendarQuery.isError ||
      fullPlanQuery.isError ||
      dayQuery.isError ||
      logQuery.isError,
    refetch,
  };
}

import {
  useGetCurrentNutritionPlanQuery,
  useGetMyNutritionPlanQuery,
  useGetMyNutritionPlansQuery,
  useGetNutritionCalendarQuery,
} from "@/api/endpoints/nutrition.endpoints";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { todayIso } from "@/shared/utils/dayProgress";
import { isPending } from "@/shared/utils/query";
import { useMemo } from "react";
import { calendarDayId, isConflict, pickActivePlan, unwrap, unwrapList } from "../data";

export interface ActiveNutritionPlan {
  /** The plan, fetched in full when possible; null when the client has none. */
  plan: any | null;
  /** Today's date as YYYY-MM-DD. */
  iso: string;
  /** Today's day id from the calendar — plan days often carry no dates. */
  todayDayId: string | null;
  isLoading: boolean;
  /** A refresh is in flight over data that's already on screen. */
  isFetching: boolean;
  isError: boolean;
  /** Two published plans cover today; distinct from "no plan" on purpose. */
  planConflict: boolean;
  retry: () => void;
}

/**
 * Which nutrition plan the client is on right now.
 *
 * Shared by the plan tab's overview and the plan-details screen so a single
 * answer drives both — and so the tab's "Details" button can link to the very
 * plan the list below it is rendering.
 */
export function useActiveNutritionPlan(): ActiveNutritionPlan {
  const iso = todayIso();
  // Every query below is cache-keyed by tenant: switching coaches must not be
  // able to serve the previous coach's plan (name, targets, days) from cache.
  const { tenantId } = useActiveTenant();

  const currentQuery = useGetCurrentNutritionPlanQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );
  const {
    data: currentData,
    isLoading: isCurrentLoading,
    isError: isCurrentError,
    error: currentError,
    refetch: refetchCurrent,
  } = currentQuery;

  // A 409 on `current` means two published plans overlap today, so it is NOT a
  // fallback trigger — but a 404/no-plan is, and the list is also how a plan that
  // starts in the future gets found.
  const plansQuery = useGetMyNutritionPlansQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );
  const {
    data: plansData,
    isLoading: isPlansLoading,
    isError: isPlansError,
    refetch: refetchPlans,
  } = plansQuery;

  // Plan days are relative to the plan's start and often carry no date, so the
  // calendar names today's day when it can. It is a hint, not the only source —
  // `normalizeDay` also derives dates from the plan's start.
  const calendarQuery = useGetNutritionCalendarQuery(
    { tenantId: tenantId ?? "", from: iso, to: iso },
    { skip: !tenantId }
  );
  const calendarData = calendarQuery.data;
  const todayDayId = useMemo(
    () => calendarDayId(unwrapList(calendarData)[0]),
    [calendarData]
  );

  const planConflict = isCurrentError && isConflict(currentError);

  const summaryPlan = useMemo(() => {
    const current = unwrap(currentData);
    if (current?.id) return current;
    return pickActivePlan(unwrapList(plansData), iso);
  }, [currentData, plansData, iso]);

  // The summary payload often omits weeks/days, so refetch the plan in full.
  // A failure here is not fatal — the summary payload is still a usable fallback.
  const fullPlanQuery = useGetMyNutritionPlanQuery(
    { tenantId: tenantId ?? "", planId: summaryPlan?.id ?? "" },
    { skip: !tenantId || !summaryPlan?.id }
  );
  const { data: fullPlanData, refetch: refetchFull } = fullPlanQuery;

  const plan = useMemo(
    () => unwrap(fullPlanData) ?? summaryPlan ?? null,
    [fullPlanData, summaryPlan]
  );

  return {
    plan,
    iso,
    todayDayId,
    // isPending, not isLoading: the full-plan read is skipped until the summary
    // names a plan, and RTK reports it neither loading nor loaded for the frame
    // in between — long enough for the screen to flash its empty state.
    isLoading:
      isCurrentLoading || isPlansLoading || isPending(fullPlanQuery, Boolean(summaryPlan?.id)),
    isFetching:
      currentQuery.isFetching ||
      plansQuery.isFetching ||
      calendarQuery.isFetching ||
      fullPlanQuery.isFetching,
    isError: !planConflict && isPlansError && isCurrentError,
    planConflict,
    retry: () => {
      refetchCurrent();
      refetchPlans();
      if (summaryPlan?.id) refetchFull();
    },
  };
}

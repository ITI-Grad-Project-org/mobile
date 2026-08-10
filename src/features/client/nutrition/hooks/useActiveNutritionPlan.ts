import {
  useGetCurrentNutritionPlanQuery,
  useGetMyNutritionPlanQuery,
  useGetMyNutritionPlansQuery,
  useGetNutritionCalendarQuery,
} from "@/api/endpoints/nutrition.endpoints";
import { todayIso } from "@/shared/utils/dayProgress";
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

  const {
    data: currentData,
    isLoading: isCurrentLoading,
    isError: isCurrentError,
    error: currentError,
    refetch: refetchCurrent,
  } = useGetCurrentNutritionPlanQuery();

  // A 409 on `current` means two published plans overlap today, so it is NOT a
  // fallback trigger — but a 404/no-plan is, and the list is also how a plan that
  // starts in the future gets found.
  const {
    data: plansData,
    isLoading: isPlansLoading,
    isError: isPlansError,
    refetch: refetchPlans,
  } = useGetMyNutritionPlansQuery();

  // Plan days are relative to the plan's start and often carry no date, so the
  // calendar names today's day when it can. It is a hint, not the only source —
  // `normalizeDay` also derives dates from the plan's start.
  const { data: calendarData } = useGetNutritionCalendarQuery({ from: iso, to: iso });
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
  const {
    data: fullPlanData,
    isLoading: isFullLoading,
    refetch: refetchFull,
  } = useGetMyNutritionPlanQuery(summaryPlan?.id ?? "", { skip: !summaryPlan?.id });

  const plan = useMemo(
    () => unwrap(fullPlanData) ?? summaryPlan ?? null,
    [fullPlanData, summaryPlan]
  );

  return {
    plan,
    iso,
    todayDayId,
    isLoading:
      isCurrentLoading || isPlansLoading || (Boolean(summaryPlan?.id) && isFullLoading),
    isError: !planConflict && isPlansError && isCurrentError,
    planConflict,
    retry: () => {
      refetchCurrent();
      refetchPlans();
      if (summaryPlan?.id) refetchFull();
    },
  };
}

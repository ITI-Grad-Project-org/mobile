import {
  useGetCurrentNutritionPlanQuery,
  useGetNutritionCalendarQuery,
  useGetNutritionDayQuery,
  useGetNutritionLogQuery,
} from "@/api/endpoints/nutrition.endpoints";
import type { NutritionTargets } from "@/api/types";
import { todayIso } from "@/shared/utils/dayProgress";
import { useMemo } from "react";
import {
  consumedMacros,
  EMPTY_MACROS,
  isConflict,
  normalizeDay,
  normalizeLog,
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
}

export function useTodayNutrition(): TodayNutrition {
  const iso = todayIso();

  const { data: planData, isLoading: isPlanLoading, error: planError } =
    useGetCurrentNutritionPlanQuery();

  const { data: calendarData, isLoading: isCalendarLoading } =
    useGetNutritionCalendarQuery({ from: iso, to: iso });

  const row = useMemo(() => unwrapList(calendarData)[0] ?? null, [calendarData]);

  const dayId: string | null = useMemo(() => {
    if (!row) return null;
    return (
      row.id ?? row.dayId ?? row.nutritionDayId ?? row.nutritionDay?.id ?? row.day?.id ?? null
    );
  }, [row]);

  // The calendar row carries the log only once the client has started one.
  const logId: string | null = useMemo(() => {
    if (!row) return null;
    return row.log?.id ?? row.logId ?? row.nutritionDayLog?.id ?? row.dayLog?.id ?? null;
  }, [row]);

  const { data: dayData, isLoading: isDayLoading } = useGetNutritionDayQuery(dayId ?? "", {
    skip: !dayId,
  });

  const { data: logData, isLoading: isLogLoading } = useGetNutritionLogQuery(logId ?? "", {
    skip: !logId,
  });

  // A 409 here means two published plans overlap today. Today's cards degrade to
  // "no plan" rather than surfacing the conflict — the Plan tab explains it.
  const plan = useMemo(
    () => (planError && isConflict(planError) ? null : unwrap(planData)),
    [planData, planError]
  );

  const day = useMemo(
    () => (dayId ? normalizeDay(dayData ?? row, plan, iso) : null),
    [dayId, dayData, row, plan, iso]
  );

  const log = useMemo(() => normalizeLog(logData), [logData]);

  const consumed = useMemo(
    () => (log ? consumedMacros(log, logData) : EMPTY_MACROS),
    [log, logData]
  );

  return {
    dayId,
    targets: day?.targets ?? {},
    consumed,
    waterMl: log?.waterMlConsumed ?? 0,
    hasPlan: Boolean(day),
    isLoading:
      isPlanLoading || isCalendarLoading || (Boolean(dayId) && isDayLoading) ||
      (Boolean(logId) && isLogLoading),
  };
}

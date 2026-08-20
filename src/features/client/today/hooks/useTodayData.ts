import { useGetActivityGraphQuery } from "@/api/endpoints/activity.endpoints";
import { useGetDirectoryCoachQuery } from "@/api/endpoints/directory.endpoints";
import { useListMeasurementsQuery } from "@/api/endpoints/measurements.endpoints";
import { useGetClientProfileQuery } from "@/api/endpoints/profile.endpoints";
import {
  useGetCalendarQuery,
  useGetCurrentProgramQuery,
  useGetMyProgramQuery,
  useGetMyProgramsQuery,
  useGetTrainingDayQuery,
} from "@/api/endpoints/training.endpoints";
import { useTodayNutrition } from "@/features/client/nutrition/hooks/useTodayNutrition";
import { MEASUREMENT_HISTORY_LIMIT } from "@/features/client/progress/lib/measurements";
import { selectActiveProgram } from "@/features/shared/plans/lib/activeProgram";
import { resolveCoachFields } from "@/lib/coach";
import { yogaExercises } from "@/lib/data";
import { plannedExerciseInfo, type PlannedExerciseInfo } from "@/lib/plannedExercise";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { todayIso as localTodayIso } from "@/shared/utils/date";
import { secondNameOf } from "@/shared/utils/name";
import { isHardError, isPending } from "@/shared/utils/query";
import { useCallback, useMemo } from "react";

export interface TodayExercise extends PlannedExerciseInfo {
  id: string;
  /** Every set already has an outcome on the server. */
  serverLogged: boolean;
  sets: number;
  reps: string;
  weight: string;
}

export interface TodayMeta {
  title: string;
  subtitle: string;
  tone: "sky" | "mint";
  mins: number;
}

export interface TodayData {
  /** "Friday, August 20" — device clock, not the server. */
  today: string;
  todayIso: string;
  clientFirstName: string;
  /** Empty until the client has joined a coach. */
  coachName: string;
  /** "" when nothing is scheduled — the Start button hides. */
  todayDayId: string;
  exercises: TodayExercise[];
  meta: TodayMeta;
  /** The server considers today's whole day finished. */
  serverDayCompleted: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetchAll: () => void;
}

/** "Friday, August 20" in the device's locale. */
function formatToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * Everything the Today tab renders, resolved as ONE unit.
 *
 * Today is assembled from ten reads across four features, and until this hook
 * existed each section owned its own — so the greeting, the streak card, the
 * workout, the nutrition cards and the check-in prompt each appeared whenever
 * their request happened to land, and the screen reflowed four or five times on
 * every visit. This mirrors the coach Home pattern instead: one `isLoading` that
 * covers every section, one `isFetching` to drive pull-to-refresh, one
 * `refetchAll`.
 *
 * The child components (StreakHero, NutritionTodayCards, CheckInCard) still
 * subscribe to their own queries. Subscribing here as well costs no extra
 * request — RTK Query dedupes by cache key, and the args below are deliberately
 * identical to the children's — but it does mean the requests are in flight
 * while the screen is still showing its spinner, so the children mount against a
 * warm cache and render in the same frame as everything else.
 */
export function useTodayData(): TodayData {
  const { tenantId } = useActiveTenant();
  const skip = { skip: !tenantId };
  const arg = { tenantId: tenantId ?? "" };

  const profile = useGetClientProfileQuery();
  const coachDir = useGetDirectoryCoachQuery(tenantId ?? "", skip);

  // Every training query is cache-keyed by tenant, so switching coaches can
  // never serve the previous coach's program out of the cache.
  const programs = useGetMyProgramsQuery(arg, skip);
  const current = useGetCurrentProgramQuery(arg, skip);

  const activeProgram = (current.data as any)?.data || current.data;

  // The programs list is unordered and carries finished and not-yet-started
  // blocks too, so today's plan is picked by its schedule — see lib/activeProgram.
  const publishedProgram = useMemo(() => {
    const raw = (programs.data as any)?.data || programs.data || [];
    return selectActiveProgram(Array.isArray(raw) ? raw : [], activeProgram);
  }, [programs.data, activeProgram]);

  const programId = publishedProgram?.id || "";
  const fullProgramQuery = useGetMyProgramQuery(
    { ...arg, programId },
    { skip: !tenantId || !programId }
  );
  const fullProgram =
    (fullProgramQuery.data as any)?.data || fullProgramQuery.data || publishedProgram;

  const todayIso = useMemo(() => localTodayIso(), []);
  const today = useMemo(() => formatToday(), []);
  const calendar = useGetCalendarQuery(
    { ...arg, from: todayIso, to: todayIso },
    { skip: !tenantId || !todayIso }
  );

  const calendarItems = useMemo(
    () => calendar.data?.data || calendar.data || [],
    [calendar.data]
  );

  const todayDayId: string =
    calendarItems[0]?.id ||
    calendarItems[0]?.dayId ||
    calendarItems[0]?.programDayId ||
    calendarItems[0]?.programDay?.id ||
    fullProgram?.weeks?.[0]?.days?.[0]?.id ||
    fullProgram?.days?.[0]?.id ||
    fullProgram?.programDays?.[0]?.id ||
    activeProgram?.currentDay?.id ||
    "";

  const dayQuery = useGetTrainingDayQuery(
    { ...arg, programDayId: todayDayId },
    { skip: !tenantId || !todayDayId }
  );

  const realDay =
    dayQuery.data?.data ||
    dayQuery.data ||
    calendarItems[0]?.programDay ||
    calendarItems[0]?.day ||
    activeProgram?.currentDay;

  // The three sections below own their own rendering; only their load state and
  // their refetch are needed here. Same args as the components use.
  const nutrition = useTodayNutrition();
  const measurements = useListMeasurementsQuery(
    { ...arg, limit: MEASUREMENT_HISTORY_LIMIT },
    skip
  );
  const activityGraph = useGetActivityGraphQuery(arg, {
    ...skip,
    refetchOnFocus: true,
  });

  const exercises = useMemo<TodayExercise[]>(() => {
    let rawList =
      realDay?.exercises ||
      realDay?.prescribedExercises ||
      realDay?.programDay?.exercises ||
      calendarItems[0]?.exercises ||
      calendarItems[0]?.programDay?.exercises ||
      calendarItems[0]?.day?.exercises ||
      fullProgram?.weeks?.[0]?.days?.[0]?.exercises ||
      fullProgram?.days?.[0]?.exercises ||
      fullProgram?.programDays?.[0]?.exercises ||
      activeProgram?.currentDay?.exercises ||
      [];

    if (!Array.isArray(rawList) || rawList.length === 0) {
      rawList = yogaExercises;
    }

    return rawList.map((exItem: any, idx: number) => {
      const setsArr = exItem.sets || exItem.prescribedSets || [];
      const firstSet = Array.isArray(setsArr) ? setsArr[0] || {} : {};
      const repsVal = firstSet.repsMin
        ? firstSet.repsMax && firstSet.repsMax !== firstSet.repsMin
          ? `${firstSet.repsMin}-${firstSet.repsMax}`
          : `${firstSet.repsMin}`
        : firstSet.reps
          ? `${firstSet.reps}`
          : exItem.reps
            ? `${exItem.reps}`
            : "10";
      const weightVal = firstSet.weightKg
        ? `${firstSet.weightKg} kg`
        : firstSet.weight
          ? `${firstSet.weight} kg`
          : "Bodyweight";

      // An exercise counts as done on the server once every one of its sets has
      // an outcome — only visible when the payload embeds the workout log.
      const outcomes = Array.isArray(setsArr)
        ? setsArr.map((s: any) => s?.outcome).filter(Boolean)
        : [];
      const serverLogged =
        Array.isArray(setsArr) && setsArr.length > 0 && outcomes.length === setsArr.length;

      // Name, muscle, media, instructions and the coach note all come off the
      // prescribed exercise — see lib/plannedExercise for the field names.
      const info = plannedExerciseInfo(exItem, idx);

      return {
        ...info,
        id: exItem.id || String(idx),
        serverLogged,
        sets:
          typeof setsArr === "number"
            ? setsArr
            : Array.isArray(setsArr) && setsArr.length
              ? setsArr.length
              : exItem.targetSets || 3,
        reps: String(repsVal),
        weight: weightVal,
      };
    });
  }, [realDay, activeProgram, fullProgram, calendarItems]);

  const meta = useMemo<TodayMeta>(() => {
    // Name the program that is actually rendered, not whatever /current said.
    const programName = publishedProgram?.name || activeProgram?.name;
    if (realDay?.name) {
      return {
        title: realDay.name,
        subtitle: `TODAY · ${programName || "PRESCRIBED WORKOUT"}`,
        tone: realDay.isRestDay ? "sky" : "mint",
        mins: realDay.estimatedMinutes || 45,
      };
    }
    if (programName) {
      return {
        title: programName,
        subtitle: "CURRENT ACTIVE PROGRAM",
        tone: "mint",
        mins: 45,
      };
    }
    return {
      title: "No Workout Scheduled",
      subtitle: "TODAY · REST DAY",
      tone: "mint",
      mins: 0,
    };
  }, [realDay, activeProgram, publishedProgram]);

  const serverDayCompleted = useMemo(() => {
    const item = calendarItems[0];
    // The API has spelled this several ways; match on any of them rather than
    // one exact string, or a finished day never ticks its exercises.
    const dayStatus = String(item?.status ?? item?.log?.status ?? "").toLowerCase();
    return (
      dayStatus === "completed" ||
      dayStatus === "done" ||
      Boolean(item?.completedAt || item?.log?.completedAt)
    );
  }, [calendarItems]);

  const refetchAll = useCallback(() => {
    profile.refetch();
    if (!tenantId) return;
    coachDir.refetch();
    programs.refetch();
    current.refetch();
    calendar.refetch();
    // Skipped queries can't be refetched — their argument may not exist yet, and
    // when it does they refetch themselves off the invalidation above.
    if (programId) fullProgramQuery.refetch();
    if (todayDayId) dayQuery.refetch();
    measurements.refetch();
    activityGraph.refetch();
    nutrition.refetch();
    // Refetch identities are stable per query, so this only re-creates when the
    // tenant or a dependent id changes — which is when the caches change too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, programId, todayDayId, nutrition.refetch]);

  return {
    today,
    todayIso,
    clientFirstName:
      secondNameOf(profile.data?.firstName, profile.data?.lastName) || "there",
    // Empty when the client hasn't joined a coach yet — the greeting then drops
    // the "with …" clause rather than printing "undefined undefined".
    coachName: resolveCoachFields(coachDir.data).name ?? "",
    todayDayId,
    exercises,
    meta,
    serverDayCompleted,
    // No tenant means every tenant-scoped read is skipped, so what's above is a
    // placeholder rather than an answer — report that as loading.
    isLoading:
      !tenantId ||
      profile.isLoading ||
      coachDir.isLoading ||
      programs.isLoading ||
      current.isLoading ||
      calendar.isLoading ||
      isPending(fullProgramQuery, Boolean(programId)) ||
      isPending(dayQuery, Boolean(todayDayId)) ||
      // The other three sections, so nothing arrives after the spinner clears.
      nutrition.isLoading ||
      measurements.isLoading ||
      activityGraph.isLoading,
    isFetching:
      profile.isFetching ||
      coachDir.isFetching ||
      programs.isFetching ||
      current.isFetching ||
      fullProgramQuery.isFetching ||
      calendar.isFetching ||
      dayQuery.isFetching ||
      nutrition.isFetching ||
      measurements.isFetching ||
      activityGraph.isFetching,
    // Only the spine of the screen can take it down. A client with no nutrition
    // plan, no measurements yet or an empty activity graph still has a workout
    // to do, and those sections each render their own empty state.
    isError:
      isHardError(programs) ||
      isHardError(current) ||
      isHardError(calendar) ||
      isHardError(fullProgramQuery) ||
      isHardError(dayQuery),
    refetchAll,
  };
}

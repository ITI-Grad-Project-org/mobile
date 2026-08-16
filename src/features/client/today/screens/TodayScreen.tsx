import { useGetDirectoryCoachQuery } from "@/api/endpoints/directory.endpoints";
import { NutritionTodayCards } from "@/features/client/nutrition";
import { CheckInCard } from "@/features/client/progress";
import { useGetClientProfileQuery } from "@/api/endpoints/profile.endpoints";
import {
  useGetCalendarQuery,
  useGetCurrentProgramQuery,
  useGetMyProgramQuery,
  useGetMyProgramsQuery,
  useGetTrainingDayQuery,
} from "@/api/endpoints/training.endpoints";
import { yogaExercises } from "@/lib/data";
import { plannedExerciseInfo } from "@/lib/plannedExercise";
import { resolveCoachFields } from "@/lib/coach";
import { selectActiveProgram } from "@/features/shared/plans/lib/activeProgram";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { todayIso as localTodayIso } from "@/shared/utils/date";
import {secondNameOf } from "@/shared/utils/name";
import {
  dayProgressKey,
  exerciseNameKey,
  readDayProgress,
  writeDayProgress,
} from "@/shared/utils/dayProgress";
import { ScrollView, Text, View } from "@/tw";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ExerciseSheet } from "../components/ExerciseSheet";
import { StreakHero } from "../components/StreakHero";
import { WorkoutCard } from "../components/WorkoutCard";

export function TodayScreen() {
  const { tenantId } = useActiveTenant();
  const { data: clientProfileData } = useGetClientProfileQuery();
  const { data: coachDir } = useGetDirectoryCoachQuery(tenantId ?? "", {
    skip: !tenantId,
  });

  const clientFirstName =
    secondNameOf(clientProfileData?.firstName, clientProfileData?.lastName) ||
    "there";
  // Empty when the client hasn't joined a coach yet — the greeting then drops
  // the "with …" clause rather than printing "undefined undefined".
  const coachName = resolveCoachFields(coachDir).name ?? "";

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    []
  );

  // Every training query is cache-keyed by tenant, so switching coaches can
  // never serve the previous coach's program out of the cache.
  const { data: myProgramsData } = useGetMyProgramsQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );
  const { data: currentProgData } = useGetCurrentProgramQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );

  const activeProgram = (currentProgData as any)?.data || currentProgData;

  // The programs list is unordered and carries finished and not-yet-started
  // blocks too, so today's plan is picked by its schedule — see lib/activeProgram.
  const publishedProgram = useMemo(() => {
    const raw = (myProgramsData as any)?.data || myProgramsData || [];
    return selectActiveProgram(Array.isArray(raw) ? raw : [], activeProgram);
  }, [myProgramsData, activeProgram]);

  const { data: fullProgramData } = useGetMyProgramQuery(
    { tenantId: tenantId ?? "", programId: publishedProgram?.id || "" },
    { skip: !tenantId || !publishedProgram?.id }
  );
  const fullProgram = (fullProgramData as any)?.data || fullProgramData || publishedProgram;

  const todayIso = useMemo(() => localTodayIso(), []);
  const { data: calendarData } = useGetCalendarQuery(
    { tenantId: tenantId ?? "", from: todayIso, to: todayIso },
    { skip: !tenantId || !todayIso }
  );

  const calendarItems = useMemo(
    () => calendarData?.data || calendarData || [],
    [calendarData]
  );
  const todayDayId =
    calendarItems[0]?.id ||
    calendarItems[0]?.dayId ||
    calendarItems[0]?.programDayId ||
    calendarItems[0]?.programDay?.id ||
    fullProgram?.weeks?.[0]?.days?.[0]?.id ||
    fullProgram?.days?.[0]?.id ||
    fullProgram?.programDays?.[0]?.id ||
    activeProgram?.currentDay?.id ||
    "";

  const { data: realDayData } = useGetTrainingDayQuery(
    { tenantId: tenantId ?? "", programDayId: todayDayId },
    { skip: !tenantId || !todayDayId }
  );

  const realDay = realDayData?.data || realDayData || calendarItems[0]?.programDay || calendarItems[0]?.day || activeProgram?.currentDay;

  const exercises = useMemo(() => {
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
      const firstSet = Array.isArray(setsArr) ? (setsArr[0] || {}) : {};
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
        sets: typeof setsArr === "number" ? setsArr : (Array.isArray(setsArr) && setsArr.length ? setsArr.length : (exItem.targetSets || 3)),
        reps: String(repsVal),
        weight: weightVal,
      };
    });
  }, [realDay, activeProgram, fullProgram, calendarItems]);

  const displayMeta = useMemo(() => {
    // Name the program that is actually rendered, not whatever /current said.
    const programName = publishedProgram?.name || activeProgram?.name;
    if (realDay?.name) {
      return {
        title: realDay.name,
        subtitle: `TODAY · ${programName || "PRESCRIBED WORKOUT"}`,
        tone: realDay.isRestDay ? ("sky" as const) : ("mint" as const),
        mins: realDay.estimatedMinutes || 45,
      };
    }
    if (programName) {
      return {
        title: programName,
        subtitle: "CURRENT ACTIVE PROGRAM",
        tone: "mint" as const,
        mins: 45,
      };
    }
    return {
      title: "No Workout Scheduled",
      subtitle: "TODAY · REST DAY",
      tone: "mint" as const,
      mins: 0,
    };
  }, [realDay, activeProgram, publishedProgram]);

  const [done, setDone] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<any | null>(null);

  const storageKey = useMemo(
    () => dayProgressKey(todayIso, tenantId),
    [todayIso, tenantId]
  );

  // Re-read on focus, not just on mount: Today stays mounted as a tab while the
  // workout logger writes ticks into the same store. The store is authoritative
  // — every local toggle here writes to it too.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      readDayProgress(storageKey).then((stored) => {
        if (isActive) setDone(stored);
      });
      return () => {
        isActive = false;
      };
    }, [storageKey])
  );

  const mergedDone = useMemo(() => {
    const item = calendarItems[0];
    // The API has spelled this several ways; match on any of them rather than
    // one exact string, or a finished day never ticks its exercises.
    const dayStatus = String(item?.status ?? item?.log?.status ?? "").toLowerCase();
    const isServerCompleted =
      dayStatus === "completed" ||
      dayStatus === "done" ||
      Boolean(item?.completedAt || item?.log?.completedAt);

    // Resolve every exercise to a single value keyed by the id this screen uses.
    // The stored map may key the same exercise by its logged id or its name, so
    // it can't just be spread over the server map.
    const resolved: Record<string, boolean> = {};
    exercises.forEach((ex: any) => {
      const local = done[ex.id] ?? done[exerciseNameKey(ex.name)];
      // A hand-tick on this screen is authoritative — including un-ticking a day
      // the server considers finished.
      resolved[ex.id] = local ?? (isServerCompleted || ex.serverLogged);
    });
    return resolved;
  }, [calendarItems, exercises, done]);

  // Count against today's exercises rather than every key in the map — the map
  // also holds logged-exercise ids written by the workout logger.
  const completed = exercises.filter((ex: any) => mergedDone[ex.id]).length;
  const pct = exercises.length > 0 ? Math.round((completed / exercises.length) * 100) : 0;

  const toggle = (id: string) => {
    // Toggle against the resolved value, not the raw map: an exercise can read
    // as done via the server or the logger's name key without `done[id]` set,
    // and toggling that would otherwise be a no-op on the first tap.
    const next = { ...done, [id]: !mergedDone[id] };
    setDone(next);
    writeDayProgress(storageKey, next);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-5 pt-5 pb-30"
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting and Profile Badge */}
      <View className="flex-row items-center justify-between px-1">
        <View className="flex-1 pr-4">
          <Text className="text-[13px] text-muted-foreground">
            {today}
            {coachName ? ` · with ${coachName}` : ""}
          </Text>
          <Text className="text-[26px] font-bold tracking-tight text-foreground mt-0.5">
            Hey {clientFirstName} 
          </Text>
        </View>
      </View>

      {/* Hero streak summary */}
      <StreakHero todayCompleted={completed} todayTotal={exercises.length} />

      {/* Today's workout card */}
      <WorkoutCard
        exercises={exercises}
        meta={displayMeta}
        done={mergedDone}
        completed={completed}
        pct={pct}
        onToggle={toggle}
        onOpenExercise={setOpen}
        onStartWorkout={
          todayDayId
            ? () => router.push(`/workout/${todayDayId}` as any)
            : undefined
        }
      />

      {/* Nutrition row — renders only when a plan covers today */}
      <NutritionTodayCards />

      {/* Check-in */}
      <CheckInCard />

      {/* Exercise Bottom Modal Drawer */}
      <ExerciseSheet
        key={open?.id}
        exercise={open}
        isDone={open ? !!mergedDone[open.id] : false}
        onClose={() => setOpen(null)}
        onDone={(id) => toggle(id)}
      />
    </ScrollView>
  );
}

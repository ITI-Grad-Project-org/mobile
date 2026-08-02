import { useGetDirectoryCoachQuery } from "@/api/endpoints/directory.endpoints";
import { useGetClientProfileQuery } from "@/api/endpoints/profile.endpoints";
import {
  useGetCalendarQuery,
  useGetCurrentProgramQuery,
  useGetMyProgramQuery,
  useGetMyProgramsQuery,
  useGetTrainingDayQuery,
} from "@/api/endpoints/training.endpoints";
import { yogaExercises } from "@/lib/data";
import { useActiveCoach, useRole } from "@/lib/role";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { ScrollView, Text, View } from "@/tw";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useMemo, useState } from "react";
import { ExerciseSheet } from "../components/ExerciseSheet";
import { StreakHero } from "../components/StreakGrid";
import { WorkoutCard } from "../components/WorkoutCard";
import { Icon } from "@/shared/ui/Icon";

export function TodayScreen() {
  const coach = useActiveCoach();
  const { clientProfile } = useRole();

  const { tenantId } = useActiveTenant();
  const { data: clientProfileData } = useGetClientProfileQuery();
  const { data: coachDir } = useGetDirectoryCoachQuery(tenantId ?? "", {
    skip: !tenantId,
  });

  const clientFirstName =
    clientProfileData?.lastName || clientProfile.lname || "there";
  const coachObj = coachDir?.coach || coachDir;
  const coachFirstName =
    coachObj?.firstName + " " + coachObj?.lastName || coachDir?.firstName + " " + coachDir?.lastName || coach.name.split(" ")[0];

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    []
  );

  const { data: myProgramsData } = useGetMyProgramsQuery();
  const { data: currentProgData } = useGetCurrentProgramQuery();

  const rawPrograms = (myProgramsData as any)?.data || myProgramsData || [];
  const programs = Array.isArray(rawPrograms) ? rawPrograms : [];
  const activeProgram = (currentProgData as any)?.data || currentProgData;
  const publishedProgram = programs.length > 0 ? programs[0] : activeProgram;

  const { data: fullProgramData } = useGetMyProgramQuery(publishedProgram?.id || "", {
    skip: !publishedProgram?.id,
  });
  const fullProgram = (fullProgramData as any)?.data || fullProgramData || publishedProgram;

  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);
  const { data: calendarData } = useGetCalendarQuery(
    { from: todayIso, to: todayIso },
    { skip: !todayIso }
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

  const { data: realDayData } = useGetTrainingDayQuery(todayDayId, {
    skip: !todayDayId,
  });

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

      return {
        id: exItem.id || String(idx),
        name: exItem.exercise?.name || exItem.name || `Exercise ${idx + 1}`,
        sets: typeof setsArr === "number" ? setsArr : (Array.isArray(setsArr) && setsArr.length ? setsArr.length : (exItem.targetSets || 3)),
        reps: String(repsVal),
        weight: weightVal,
        muscle: exItem.exercise?.primaryMuscle || exItem.primaryMuscle || exItem.muscle || "Full Body",
        image: exItem.exercise?.thumbnailUrl || exItem.thumbnailUrl || exItem.image || "",
        instructions: exItem.exercise?.instructionSteps || exItem.instructions || [
          "Begin in starting stance with core braced.",
          "Execute movement with controlled form.",
          "Squeeze target muscles at full extension.",
          "Return safely to baseline."
        ],
        gifUrl: exItem.exercise?.demoGifUrl || exItem.demoGifUrl || exItem.gifUrl || "",
        videoUrl: exItem.exercise?.demoVideoUrl || exItem.demoVideoUrl || exItem.videoUrl || "",
      };
    });
  }, [realDay, activeProgram, fullProgram, calendarItems]);

  const displayMeta = useMemo(() => {
    if (realDay?.name) {
      return {
        title: realDay.name,
        subtitle: `TODAY · ${activeProgram?.name || "PRESCRIBED WORKOUT"}`,
        tone: realDay.isRestDay ? ("sky" as const) : ("mint" as const),
        mins: realDay.estimatedMinutes || 45,
      };
    }
    if (activeProgram?.name) {
      return {
        title: activeProgram.name,
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
  }, [realDay, activeProgram]);

  const [done, setDone] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<any | null>(null);

  const storageKey = useMemo(
    () => `today_done_${todayIso}_${tenantId || "default"}`,
    [todayIso, tenantId]
  );

  useEffect(() => {
    let isMounted = true;
    SecureStore.getItemAsync(storageKey)
      .then((raw) => {
        if (isMounted && raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
              setDone((prev) => ({ ...parsed, ...prev }));
            }
          } catch {
            // ignore
          }
        }
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  const mergedDone = useMemo(() => {
    const isServerCompleted = calendarItems[0]?.status === "completed";
    if (isServerCompleted && exercises.length > 0) {
      const serverDone: Record<string, boolean> = {};
      exercises.forEach((ex: any) => {
        serverDone[ex.id] = true;
      });
      return { ...serverDone, ...done };
    }
    return done;
  }, [calendarItems, exercises, done]);

  const completed = Object.values(mergedDone).filter(Boolean).length;
  const pct = exercises.length > 0 ? Math.round((completed / exercises.length) * 100) : 0;

  const toggle = (id: string) => {
    setDone((d) => {
      const next = { ...d, [id]: !d[id] };
      SecureStore.setItemAsync(storageKey, JSON.stringify(next)).catch(() => { });
      return next;
    });
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
            {today} · with {coachFirstName}
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

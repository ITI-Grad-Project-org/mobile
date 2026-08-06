import {
  useGetCalendarQuery,
  useGetCurrentProgramQuery,
  useGetMyProgramQuery,
  useGetMyProgramsQuery,
} from "@/api/endpoints/training.endpoints";
import { plannedExerciseInfo } from "@/lib/plannedExercise";
import { useActiveCoach } from "@/lib/role";
import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { todayIso } from "@/shared/utils/dayProgress";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { DayCard } from "../components/DayCard";
import { DaySheet } from "../components/DaySheet";
import { NutritionOverview } from "@/features/client/nutrition";
import { PlanSegmented, type PlanSub } from "../components/PlanSegmented";
import type { DayPlan } from "../data";

export function PlanScreen() {
  const coach = useActiveCoach();

  const { data: myProgramsData } = useGetMyProgramsQuery();
  const { data: currentProgData } = useGetCurrentProgramQuery();

  const rawPrograms = (myProgramsData as any)?.data || myProgramsData || [];
  const programs = Array.isArray(rawPrograms) ? rawPrograms : [];
  const currentProgram = (currentProgData as any)?.data || currentProgData;

  const publishedProgram = programs.length > 0 ? programs[0] : currentProgram;

  const { data: fullProgramData } = useGetMyProgramQuery(
    publishedProgram?.id || "",
    {
      skip: !publishedProgram?.id,
    }
  );

  const fullProgram =
    (fullProgramData as any)?.data || fullProgramData || publishedProgram;

  // Today's scheduled day, straight from the calendar — the program payload
  // doesn't always carry dates, and this is what Today already keys off.
  const iso = todayIso();
  const { data: calendarData } = useGetCalendarQuery({ from: iso, to: iso });
  const todayDayId = useMemo(() => {
    const items = (calendarData as any)?.data || calendarData || [];
    const item = Array.isArray(items) ? items[0] : null;
    return (
      item?.id || item?.dayId || item?.programDayId || item?.programDay?.id || null
    );
  }, [calendarData]);

  const weeksList = useMemo(() => {
    const rawWeeks =
      fullProgram?.weeks || publishedProgram?.weeks || currentProgram?.weeks;
    return Array.isArray(rawWeeks) ? rawWeeks : [];
  }, [fullProgram, publishedProgram, currentProgram]);

  const totalWeeks = useMemo(() => {
    if (weeksList.length > 0) return weeksList.length;
    const duration =
      fullProgram?.durationWeeks ||
      publishedProgram?.durationWeeks ||
      currentProgram?.durationWeeks;
    if (typeof duration === "number" && duration > 1) return duration;
    return 1;
  }, [weeksList, fullProgram, publishedProgram, currentProgram]);

  /** Does this raw day fall on today? By id first, then its own date. */
  const isTodayDay = useCallback(
    (day: any) => {
      if (!day) return false;
      if (todayDayId && day.id === todayDayId) return true;
      const dateStr = day.scheduledDate || day.date || day.scheduledAt;
      return typeof dateStr === "string" && dateStr.split("T")[0] === iso;
    },
    [todayDayId, iso]
  );

  const todayWeekIndex = useMemo(() => {
    const found = weeksList.findIndex((week: any) =>
      (week?.days || []).some(isTodayDay)
    );
    return found >= 0 ? found : null;
  }, [weeksList, isTodayDay]);

  // Default to the week today falls in; an arrow tap pins the choice from then
  // on, so browsing ahead isn't yanked back when the program data refreshes.
  const [weekOverride, setWeekOverride] = useState<number | null>(null);
  const selectedWeekIndex = weekOverride ?? todayWeekIndex ?? 0;

  const days: DayPlan[] = useMemo(() => {
    let rawDays: any[] = [];
    if (weeksList.length > 0) {
      const selectedWeek = weeksList[selectedWeekIndex] || weeksList[0];
      rawDays = selectedWeek?.days || [];
    } else {
      const flatDays =
        fullProgram?.days ||
        fullProgram?.programDays ||
        publishedProgram?.days ||
        publishedProgram?.programDays ||
        [];

      if (Array.isArray(flatDays) && flatDays.length > 0) {
        const weekNum = selectedWeekIndex + 1;
        const matchingDays = flatDays.filter(
          (d: any) => (d.weekNumber || 1) === weekNum
        );
        if (matchingDays.length > 0) {
          rawDays = matchingDays;
        } else if (flatDays.length > 7) {
          rawDays = flatDays.slice(
            selectedWeekIndex * 7,
            (selectedWeekIndex + 1) * 7
          );
        } else {
          rawDays = flatDays;
        }
      }
    }

    if (!Array.isArray(rawDays) || rawDays.length === 0) return [];

    return rawDays.map((day: any, i: number) => {
      let shortWeekday = `D${day.dayNumber || day.position || i + 1}`;
      let dayOfMonth: number = Number(day.dayNumber || day.position || i + 1);

      const dateStr = day.scheduledDate || day.date || day.scheduledAt;
      if (dateStr && typeof dateStr === "string") {
        const parts = dateStr.split("T")[0].split("-").map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
          const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
          shortWeekday = dateObj.toLocaleDateString("en-US", {
            weekday: "short",
          });
          dayOfMonth = dateObj.getDate();
        }
      }

      return {
        id: day.id,
        isToday: isTodayDay(day),
        d: shortWeekday,
        date: dayOfMonth,
        title: day.name || `Day ${day.dayNumber || day.position || i + 1}`,
        tone: day.isRestDay ? "sky" : i % 2 === 0 ? "mint" : "lilac",
        mins: day.estimatedMinutes || 45,
        type: day.isRestDay ? "REST DAY" : "WORKOUT DAY",
        icon: day.isRestDay ? "sparkles" : "dumbbell",
        desc: day.notes || "",
        exercises: (
          day.exercises ||
          day.loggedExercises ||
          day.prescribedExercises ||
          []
        ).map((exItem: any, idx: number) => {
          const setsCount =
            exItem.sets?.length ||
            exItem.prescribedSets?.length ||
            exItem.targetSets ||
            3;
          const firstSet = exItem.sets?.[0] || {};
          const repsVal = firstSet.repsMin
            ? firstSet.repsMax
              ? `${firstSet.repsMin}-${firstSet.repsMax}`
              : `${firstSet.repsMin}`
            : exItem.reps || exItem.targetReps || "10";
          const weightVal = firstSet.weightKg
            ? `${firstSet.weightKg} kg`
            : exItem.weight || exItem.targetWeight || "Bodyweight";

          return {
            // Name, muscle, media, instructions and the coach note all come off
            // the prescribed exercise — see lib/plannedExercise for the shape.
            ...plannedExerciseInfo(exItem, idx),
            id: exItem.id || `ex-${idx}`,
            sets: `${setsCount} sets`,
            reps: String(repsVal),
            weight: weightVal,
          };
        }),
        notes: day.notes,
      };
    });
  }, [fullProgram, publishedProgram, weeksList, selectedWeekIndex, isTodayDay]);

  const [sub, setSub] = useState<PlanSub>("training");
  const [openDay, setOpenDay] = useState<DayPlan | null>(null);

  const displayTitle = publishedProgram?.name || "Training Plan";
  const displaySubtitle =
    publishedProgram?.description || `Coached by ${coach.name.split(" ")[0]}`;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-5 pt-5 pb-30"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-1 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[26px] font-bold tracking-tight text-foreground">
            {displayTitle}
          </Text>
          <Text
            className="text-[13.5px] text-muted-foreground mt-0.5"
            numberOfLines={1}
          >
            {displaySubtitle}
          </Text>
        </View>
        {publishedProgram?.id ? (
          <Pressable
            onPress={() =>
              router.push(`/program/${publishedProgram.id}` as any)
            }
            className="rounded-xl bg-secondary px-3.5 py-2 active:opacity-80 flex-row items-center gap-1 shrink-0"
          >
            <Text className="text-[12px] font-semibold text-foreground">
              Details
            </Text>
            <Icon name="chevron-right" size={14} color="--foreground" />
          </Pressable>
        ) : null}
      </View>

      {/* Training / Nutrition toggle */}
      <PlanSegmented value={sub} onChange={setSub} />

      {/* Content */}
      {sub === "training" ? (
        <View className="gap-y-4">
          {/* Week Switcher Card */}
          {totalWeeks > 1 ? (
            <Card glass className="flex-row items-center justify-between p-3">
              <Pressable
                onPress={() => setWeekOverride(Math.max(0, selectedWeekIndex - 1))}
                disabled={selectedWeekIndex === 0}
                className={cn(
                  "h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-70",
                  selectedWeekIndex === 0 && "opacity-40"
                )}
                accessibilityLabel="Previous week"
              >
                <Icon name="chevron-left" size={16} color="--foreground" />
              </Pressable>

              <View className="items-center">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {publishedProgram?.schedulePhase
                    ? publishedProgram.schedulePhase.replace("_", " ")
                    : "BLOCK A"}
                </Text>
                <Text className="text-[16px] font-bold text-foreground">
                  Week {selectedWeekIndex + 1} of {totalWeeks}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setWeekOverride(Math.min(totalWeeks - 1, selectedWeekIndex + 1))
                }
                disabled={selectedWeekIndex >= totalWeeks - 1}
                className={cn(
                  "h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-70",
                  selectedWeekIndex >= totalWeeks - 1 && "opacity-40"
                )}
                accessibilityLabel="Next week"
              >
                <Icon name="chevron-right" size={16} color="--foreground" />
              </Pressable>
            </Card>
          ) : null}

          {days.length === 0 ? (
            <Card glass className="p-8 items-center justify-center">
              <Icon name="dumbbell" size={36} color="--muted-foreground" />
              <Text className="mt-3 text-[16px] font-bold text-foreground">
                No Program Published Yet
              </Text>
              <Text className="mt-1 text-[13px] text-muted-foreground text-center leading-relaxed">
                Your coach has not published a training program for your active
                tenant yet. Check back soon or contact your coach to get
                started!
              </Text>
            </Card>
          ) : (
            days.map((day) => (
              <DayCard
                key={day.id || day.d}
                day={day}
                onPress={() => setOpenDay(day)}
              />
            ))
          )}
        </View>
      ) : (
        <NutritionOverview />
      )}

      {/* Day detail sheet */}
      <DaySheet day={openDay} onClose={() => setOpenDay(null)} />
    </ScrollView>
  );
}

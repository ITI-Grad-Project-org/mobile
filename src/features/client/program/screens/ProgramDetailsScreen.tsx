import {
  useGetCalendarQuery,
  useGetMyProgramQuery,
} from "@/api/endpoints/training.endpoints";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Card } from "@/shared/ui/Card";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { PlanDetailHeader } from "@/shared/ui/PlanDetailHeader";
import { SectionHeader } from "@/shared/ui/SectionHeader";
import { WeekProgress } from "@/shared/ui/WeekProgress";
import { WeekStepper } from "@/shared/ui/WeekStepper";
import { todayIso } from "@/shared/utils/dayProgress";
import { ScrollView, Text, View } from "@/tw";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator } from "react-native";
import { TodayWorkoutCard } from "../components/TodayWorkoutCard";
import { CompletedWorkoutRow, UpcomingWorkoutRow } from "../components/WorkoutRows";
import { buildWeek, findTodayWeekIndex, weekCountOf } from "@/features/shared/plans/lib/programWeek";

interface ProgramDetailsScreenProps {
  programId: string;
}

export function ProgramDetailsScreen({ programId }: ProgramDetailsScreenProps) {
  // Keyed by tenant: this screen is reached with a programId in the route, so
  // without it a coach switch would re-serve the old coach's program from cache.
  const { tenantId } = useActiveTenant();

  const {
    data: programData,
    isLoading,
    isError,
  } = useGetMyProgramQuery(
    { tenantId: tenantId ?? "", programId },
    { skip: !tenantId || !programId }
  );

  const program = programData?.data || programData;

  // Today's scheduled day id, straight from the calendar — the program payload
  // doesn't always carry dates, and this is what Today already keys off.
  const iso = todayIso();
  const { data: calendarData } = useGetCalendarQuery(
    { tenantId: tenantId ?? "", from: iso, to: iso },
    { skip: !tenantId }
  );
  const todayDayId = useMemo(() => {
    const items = (calendarData as any)?.data || calendarData || [];
    const item = Array.isArray(items) ? items[0] : null;
    return item?.id || item?.dayId || item?.programDayId || item?.programDay?.id || null;
  }, [calendarData]);

  const baseOptions = useMemo(() => ({ todayIso: iso, todayDayId }), [iso, todayDayId]);

  const totalWeeks = weekCountOf(program);
  const currentWeekIndex = useMemo(
    () => (program ? findTodayWeekIndex(program, baseOptions) : null),
    [program, baseOptions]
  );

  // Default to the week today falls in; an arrow tap pins the choice from then
  // on, so browsing ahead isn't yanked back when the program data refreshes.
  const [weekOverride, setWeekOverride] = useState<number | null>(null);
  const weekIndex = Math.min(
    Math.max(0, weekOverride ?? currentWeekIndex ?? 0),
    Math.max(0, totalWeeks - 1)
  );

  const week = useMemo(
    () => (program ? buildWeek(program, weekIndex, baseOptions) : null),
    [program, weekIndex, baseOptions]
  );

  const today = week?.workouts.find((w) => w.state === "today") ?? null;
  const upcoming = week?.workouts.filter((w) => w.state === "upcoming") ?? [];
  const completed = week?.workouts.filter((w) => w.state === "done") ?? [];
  const totalWorkouts = week?.workouts.length ?? 0;

  const openDay = (id: string) => router.push(`/workout/${id}` as any);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <ActivityIndicator size="large" color="--primary" />
        <Text className="mt-4 text-[13px] text-muted-foreground">Loading program…</Text>
      </View>
    );
  }

  if (isError || !program || !week) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Icon name="alert-triangle" size={28} color="--destructive" />
        <Text className="mt-3 text-[15px] font-bold text-foreground">Program not found</Text>
        <Text className="mt-1 text-[12px] text-muted-foreground">
          It may have been unpublished by your coach.
        </Text>
        <GlassButton
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          className="mt-4 rounded-full px-4 py-2.5"
        >
          <Text className="text-[13px] font-semibold text-foreground">Go Back</Text>
        </GlassButton>
      </View>
    );
  }

  const tags = [
    program.difficulty ? String(program.difficulty) : "All levels",
    totalWeeks > 1 ? `${totalWeeks} weeks` : "1 week",
    program.goal ? String(program.goal).replace(/_/g, " ") : null,
  ].filter(Boolean) as string[];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-20"
      showsVerticalScrollIndicator={false}
    >
      {/* Sits under the client layout's AppHeader, so no top inset here. */}
      <PlanDetailHeader
        eyebrow="Published Program"
        title={program.name || "Training program"}
        subtitle={program.description || null}
        tags={tags}
      />

      <View className="gap-y-4 p-4">
        <WeekProgress done={completed.length} total={totalWorkouts} />

        <WeekStepper
          index={weekIndex}
          total={totalWeeks}
          dateRange={week.dateRange}
          isCurrent={currentWeekIndex === weekIndex}
          onChange={setWeekOverride}
        />

        {today ? (
          <TodayWorkoutCard
            workout={today}
            onStart={() => openDay(today.id)}
            onOpen={() => openDay(today.id)}
          />
        ) : null}

        {totalWorkouts === 0 ? (
          <Card glass className="items-center py-8">
            <Icon name="clipboard-list" size={28} color="--muted-foreground" />
            <Text className="mt-2 text-[14px] font-semibold text-foreground">
              Nothing scheduled this week
            </Text>
            <Text className="mt-1 text-[12px] text-muted-foreground">
              Your coach hasn&apos;t prescribed any workouts here yet.
            </Text>
          </Card>
        ) : null}

        {upcoming.length > 0 ? (
          <View className="gap-y-2.5">
            <SectionHeader label="Rest of week" hint={`${upcoming.length} remaining`} />
            {upcoming.map((workout) => (
              <UpcomingWorkoutRow
                key={workout.id}
                workout={workout}
                onPress={() => openDay(workout.id)}
              />
            ))}
          </View>
        ) : null}

        {completed.length > 0 ? (
          <View className="gap-y-2.5">
            <SectionHeader label="Completed" hint={`${completed.length} done`} />
            {completed.map((workout) => (
              <CompletedWorkoutRow
                key={workout.id}
                workout={workout}
                onPress={() => openDay(workout.id)}
              />
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

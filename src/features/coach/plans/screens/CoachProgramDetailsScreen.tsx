import { useGetProgramQuery } from "@/api/endpoints/programs.endpoints";
import { buildWeek, findTodayWeekIndex, weekCountOf } from "@/features/shared/plans/lib/programWeek";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { PlanDetailHeader } from "@/shared/ui/PlanDetailHeader";
import { SectionHeader } from "@/shared/ui/SectionHeader";
import { WeekStepper } from "@/shared/ui/WeekStepper";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { PlanClientRow } from "../components/PlanClientRow";
import { PlanLoading, PlanNotFound } from "../components/PlanStates";
import { PlanTimelineCard } from "../components/PlanTimelineCard";
import { useCoachPlanClient } from "../hooks/useCoachPlanClient";
import { describePlanStart, planSchedule, programStats, todayIso } from "../lib/coachPlanDays";
import { normalizePlan } from "../lib/normalizePlan";

interface CoachProgramDetailsScreenProps {
  programId: string;
}

/**
 * A training program as its author sees it: who it is for, what it prescribes,
 * and a week-by-week walk through its days. The client-facing
 * ProgramDetailsScreen is built from the same parts, so the two read alike.
 */
export function CoachProgramDetailsScreen({ programId }: CoachProgramDetailsScreenProps) {
  const { tenantId } = useActiveTenant();

  const { data, isLoading, isError } = useGetProgramQuery(
    { tenantId: tenantId ?? "", programId },
    { skip: !tenantId || !programId }
  );

  // The training payload is undocumented, so everything the header and cards
  // show goes through the same normalizer the list uses.
  const plan = useMemo(() => normalizePlan(data, "training"), [data]);

  const today = useMemo(() => todayIso(), []);
  const options = useMemo(() => ({ todayIso: today }), [today]);

  const totalWeeks = weekCountOf(data);
  const currentWeekIndex = useMemo(
    () => (data ? findTodayWeekIndex(data, options) : null),
    [data, options]
  );

  const [weekOverride, setWeekOverride] = useState<number | null>(null);
  const weekIndex = Math.min(
    Math.max(0, weekOverride ?? currentWeekIndex ?? 0),
    Math.max(0, totalWeeks - 1)
  );

  const week = useMemo(
    () => (data ? buildWeek(data, weekIndex, options) : null),
    [data, weekIndex, options]
  );

  // Training payloads carry no embedded client, so the name comes from the
  // coach's roster via the plan's membershipId.
  const { client } = useCoachPlanClient(plan?.membershipId ?? null, plan?.client ?? null);

  const schedule = useMemo(() => planSchedule(data, today), [data, today]);
  const stats = useMemo(() => {
    const { sessions, restDays, frequency } = programStats(data);
    return [
      { value: String(sessions), label: "sessions" },
      { value: String(restDays), label: "rest days" },
      { value: frequency, label: "frequency" },
    ];
  }, [data]);

  if (isLoading) return <PlanLoading label="Loading program…" />;

  if (isError || !plan || !week) {
    return (
      <PlanNotFound
        title="Program not found"
        hint="It may have been deleted or moved to another business."
      />
    );
  }

  const tags = [
    `${plan.durationWeeks} ${plan.durationWeeks === 1 ? "week" : "weeks"}`,
    plan.goal,
    plan.difficulty,
  ].filter(Boolean) as string[];

  const openDay = (programDayId: string) =>
    router.push({
      pathname: "/(coach)/plans/training/[programId]/days/[programDayId]",
      params: { programId, programDayId },
    });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-screen"
      showsVerticalScrollIndicator={false}
    >
      <PlanDetailHeader
        eyebrow={`${plan.status} training program`}
        tone="lilac"
        title={plan.name}
        subtitle={plan.description}
        tags={tags}
      />

      <View className="gap-y-4 p-4">
        <PlanClientRow
          client={client}
          kind="training"
          since={describePlanStart(schedule.startDate, today)}
          onChat={
            client?.id
              ? () =>
                  router.push({
                    pathname: "/(coach)/chat/[id]",
                    params: { id: client.id as string },
                  })
              : undefined
          }
        />

        <PlanTimelineCard plan={plan} schedule={schedule} stats={stats} />

        <WeekStepper
          index={weekIndex}
          total={Math.max(1, totalWeeks)}
          dateRange={week.dateRange}
          isCurrent={currentWeekIndex === weekIndex}
          onChange={setWeekOverride}
        />

        {week.workouts.length === 0 ? (
          <Card glass className="items-center py-8">
            <Icon name="clipboard-list" size={26} color="--muted-foreground" />
            <Text className="mt-2 text-[14px] font-semibold text-foreground">
              Nothing prescribed this week
            </Text>
            <Text className="mt-1 text-[12px] text-muted-foreground">
              Add training days on the dashboard.
            </Text>
          </Card>
        ) : (
          <View className="gap-y-2.5">
            <SectionHeader
              label="Training days"
              hint={`${week.workouts.length} ${week.workouts.length === 1 ? "day" : "days"}`}
            />
            {week.workouts.map((workout) => (
              <Pressable
                key={workout.id}
                onPress={() => openDay(workout.id)}
                className="flex-row items-center gap-x-3 rounded-2xl border border-border bg-card p-3 active:opacity-90"
              >
                <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lilac">
                  <Text className="text-[9px] font-bold uppercase tracking-wider text-lilac-ink">
                    {workout.dayOfWeek}
                  </Text>
                  <Text className="text-[14px] font-bold leading-tight text-lilac-ink">
                    {workout.dayOfMonth}
                  </Text>
                </View>

                <View className="min-w-0 flex-1">
                  <Text className="text-[14px] font-semibold text-foreground" numberOfLines={1}>
                    {workout.title}
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-muted-foreground" numberOfLines={1}>
                    {workout.exerciseCount}{" "}
                    {workout.exerciseCount === 1 ? "exercise" : "exercises"}
                    {workout.focusTags.length > 0 ? ` · ${workout.focusTags.join(", ")}` : ""}
                  </Text>
                </View>

                {workout.state === "done" ? (
                  <View className="shrink-0 rounded-full bg-mint px-2 py-0.5">
                    <Text className="text-[9px] font-bold uppercase tracking-wider text-mint-ink">
                      logged
                    </Text>
                  </View>
                ) : null}
                <Icon name="chevron-right" size={14} color="--muted-foreground" />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

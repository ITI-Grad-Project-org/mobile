import { useGetMyNutritionPlanQuery } from "@/api/endpoints/nutrition.endpoints";
import { Card } from "@/shared/ui/Card";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { PlanDetailHeader } from "@/shared/ui/PlanDetailHeader";
import { SectionHeader } from "@/shared/ui/SectionHeader";
import { WeekProgress } from "@/shared/ui/WeekProgress";
import { WeekStepper } from "@/shared/ui/WeekStepper";
import { ScrollView, Text, View } from "@/tw";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator } from "react-native";
import { TargetsCard } from "../components/TargetsCard";
import { CompletedDayRow, UpcomingDayRow } from "../components/NutritionDayRows";
import { TodayNutritionCard } from "../components/TodayNutritionCard";
import { formatKcal, resolveTargets, unwrap } from "../data";
import { useActiveNutritionPlan } from "../hooks/useActiveNutritionPlan";
import { buildWeek, findTodayWeekIndex, planDays, weekCountOf } from "../lib/nutritionWeek";

interface NutritionPlanDetailsScreenProps {
  planId: string;
}

/**
 * The nutrition plan, week by week — the counterpart to ProgramDetailsScreen,
 * built from the same parts so the two read identically: identity header,
 * week progress, stepper, today's CTA, then what's left and what's done.
 */
export function NutritionPlanDetailsScreen({ planId }: NutritionPlanDetailsScreenProps) {
  const {
    data: planData,
    isLoading,
    isError,
  } = useGetMyNutritionPlanQuery(planId, { skip: !planId });

  // Only for the calendar hint and today's date — the plan itself comes from the
  // route, so a client can open any plan they were given, not just the active one.
  const { iso, todayDayId } = useActiveNutritionPlan();

  const plan = useMemo(() => unwrap(planData) ?? null, [planData]);

  const options = useMemo(() => ({ todayIso: iso, todayDayId }), [iso, todayDayId]);
  const allDays = useMemo(() => planDays(plan, options), [plan, options]);

  const totalWeeks = weekCountOf(plan, allDays);
  const currentWeekIndex = useMemo(() => findTodayWeekIndex(allDays), [allDays]);

  // Default to the week today falls in; an arrow tap pins the choice from then
  // on, so browsing ahead isn't yanked back when the plan data refreshes.
  const [weekOverride, setWeekOverride] = useState<number | null>(null);
  const weekIndex = Math.min(
    Math.max(0, weekOverride ?? currentWeekIndex ?? 0),
    Math.max(0, totalWeeks - 1)
  );

  const week = useMemo(
    () => (plan ? buildWeek(plan, weekIndex, options, allDays) : null),
    [plan, weekIndex, options, allDays]
  );

  const today = week?.days.find((entry) => entry.state === "today") ?? null;
  const upcoming = week?.days.filter((entry) => entry.state === "upcoming") ?? [];
  const completed = week?.days.filter((entry) => entry.state === "done") ?? [];
  const totalDays = week?.days.length ?? 0;

  const baseline = useMemo(() => resolveTargets(null, plan), [plan]);

  const openDay = (id: string) => router.push(`/nutrition/${id}` as any);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <ActivityIndicator size="large" color="--primary" />
        <Text className="mt-4 text-[13px] text-muted-foreground">Loading plan…</Text>
      </View>
    );
  }

  if (isError || !plan || !week) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Icon name="alert-triangle" size={28} color="--destructive" />
        <Text className="mt-3 text-[15px] font-bold text-foreground">
          Nutrition plan not found
        </Text>
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
    typeof baseline.targetCalories === "number"
      ? `${formatKcal(baseline.targetCalories)} kcal`
      : null,
    totalWeeks > 1 ? `${totalWeeks} weeks` : "1 week",
    plan.goal ? String(plan.goal).replace(/_/g, " ") : null,
  ].filter(Boolean) as string[];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-20"
      showsVerticalScrollIndicator={false}
    >
      {/* Sits under the client layout's AppHeader, so no top inset here. */}
      <PlanDetailHeader
        eyebrow="Published Nutrition Plan"
        tone="mint"
        title={plan.name || "Nutrition plan"}
        subtitle={plan.description || null}
        tags={tags}
      />

      <View className="gap-y-4 p-4">
        <WeekProgress done={completed.length} total={totalDays} noun="day" />

        <WeekStepper
          index={weekIndex}
          total={totalWeeks}
          dateRange={week.dateRange}
          isCurrent={currentWeekIndex === weekIndex}
          onChange={setWeekOverride}
        />

        {/* The prescription itself — today's when today is in this plan. */}
        <TargetsCard
          targets={today ? today.day.targets : baseline}
          title={today ? "Today's target" : "Daily target"}
        />

        {today ? (
          <TodayNutritionCard
            entry={today}
            onLog={() => openDay(today.day.id)}
            onOpen={() => openDay(today.day.id)}
          />
        ) : null}

        {totalDays === 0 ? (
          <Card glass className="items-center py-8">
            <Icon name="clipboard-list" size={28} color="--muted-foreground" />
            <Text className="mt-2 text-[14px] font-semibold text-foreground">
              Nothing scheduled this week
            </Text>
            <Text className="mt-1 text-[12px] text-muted-foreground">
              Your coach hasn&apos;t prescribed any days here yet.
            </Text>
          </Card>
        ) : null}

        {upcoming.length > 0 ? (
          <View className="gap-y-2.5">
            <SectionHeader label="Rest of week" hint={`${upcoming.length} remaining`} />
            {upcoming.map((entry) => (
              <UpcomingDayRow
                key={entry.day.id}
                entry={entry}
                onPress={() => openDay(entry.day.id)}
              />
            ))}
          </View>
        ) : null}

        {completed.length > 0 ? (
          <View className="gap-y-2.5">
            <SectionHeader label="Logged" hint={`${completed.length} done`} />
            {completed.map((entry) => (
              <CompletedDayRow
                key={entry.day.id}
                entry={entry}
                onPress={() => openDay(entry.day.id)}
              />
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

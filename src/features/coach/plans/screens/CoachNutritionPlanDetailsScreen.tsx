import { useGetNutritionPlanQuery } from "@/api/endpoints/nutritionPlans.endpoints";
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
import { PlanTimelineCard, statValue } from "../components/PlanTimelineCard";
import { PlanTargetsRow } from "../components/PlanTargetsRow";
import { useCoachPlanClient } from "../hooks/useCoachPlanClient";
import {
  buildNutritionWeek,
  findNutritionTodayWeek,
  nutritionMealsPerDay,
  nutritionWeekCount,
  planSchedule,
  relativeSince,
  todayIso,
} from "../lib/coachPlanDays";
import { formatNumber, normalizePlan } from "../lib/normalizePlan";

interface CoachNutritionPlanDetailsScreenProps {
  planId: string;
}

/** A nutrition plan as its author sees it — the training screen's twin. */
export function CoachNutritionPlanDetailsScreen({
  planId,
}: CoachNutritionPlanDetailsScreenProps) {
  const { tenantId } = useActiveTenant();

  const { data, isLoading, isError } = useGetNutritionPlanQuery(
    { tenantId: tenantId ?? "", planId },
    { skip: !tenantId || !planId }
  );

  const plan = useMemo(() => normalizePlan(data, "nutrition"), [data]);

  const today = useMemo(() => todayIso(), []);
  const totalWeeks = nutritionWeekCount(data);
  const currentWeekIndex = useMemo(
    () => (data ? findNutritionTodayWeek(data, today) : null),
    [data, today]
  );

  const [weekOverride, setWeekOverride] = useState<number | null>(null);
  const weekIndex = Math.min(
    Math.max(0, weekOverride ?? currentWeekIndex ?? 0),
    Math.max(0, totalWeeks - 1)
  );

  const week = useMemo(
    () => (data ? buildNutritionWeek(data, weekIndex, today) : null),
    [data, weekIndex, today]
  );

  // Nutrition payloads embed membership.client, so this usually answers from
  // the plan itself and never touches the roster.
  const { client } = useCoachPlanClient(plan?.membershipId ?? null, plan?.client ?? null);

  const schedule = useMemo(() => planSchedule(data, today), [data, today]);
  const stats = useMemo(() => {
    const mealsPerDay = nutritionMealsPerDay(data);
    return [
      { value: statValue(plan?.targets?.calories), label: "kcal" },
      {
        value: statValue(plan?.targets?.proteinG),
        unit: plan?.targets?.proteinG != null ? "g" : undefined,
        label: "protein",
      },
      { value: mealsPerDay !== null ? String(mealsPerDay) : "—", label: "meals per day" },
    ];
  }, [data, plan?.targets]);

  if (isLoading) return <PlanLoading label="Loading nutrition plan…" />;

  if (isError || !plan || !week) {
    return (
      <PlanNotFound
        title="Nutrition plan not found"
        hint="It may have been deleted or moved to another business."
      />
    );
  }

  const calories = data?.targets?.calories;
  const tags = [
    typeof calories === "number" ? `${formatNumber(calories)} kcal` : null,
    `${plan.durationWeeks} ${plan.durationWeeks === 1 ? "week" : "weeks"}`,
    plan.goal,
  ].filter(Boolean) as string[];

  const openDay = (dayId: string) =>
    router.push({
      pathname: "/(coach)/plans/nutrition/[planId]/days/[dayId]",
      params: { planId, dayId },
    });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-20"
      showsVerticalScrollIndicator={false}
    >
      <PlanDetailHeader
        eyebrow={`${plan.status} nutrition plan`}
        tone="mint"
        title={plan.name}
        subtitle={plan.description}
        tags={tags}
      />

      <View className="gap-y-4 p-4">
        <PlanClientRow
          client={client}
          since={
            schedule.startDate ? `Started ${relativeSince(schedule.startDate, today)}` : null
          }
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

        <PlanTargetsRow targets={data?.targets} title="Daily target" />

        <WeekStepper
          index={weekIndex}
          total={Math.max(1, totalWeeks)}
          dateRange={week.dateRange}
          isCurrent={currentWeekIndex === weekIndex}
          onChange={setWeekOverride}
        />

        {week.days.length === 0 ? (
          <Card glass className="items-center py-8">
            <Icon name="clipboard-list" size={26} color="--muted-foreground" />
            <Text className="mt-2 text-[14px] font-semibold text-foreground">
              Nothing prescribed this week
            </Text>
            <Text className="mt-1 text-[12px] text-muted-foreground">
              Add meals on the dashboard.
            </Text>
          </Card>
        ) : (
          <View className="gap-y-2.5">
            <SectionHeader
              label="Days"
              hint={`${week.days.length} ${week.days.length === 1 ? "day" : "days"}`}
            />
            {week.days.map((day) => {
              // A fully flexible day with no meals has nothing to open.
              const hasDetail = day.mealCount > 0;
              const body = (
                <>
                  <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint">
                    <Text className="text-[9px] font-bold uppercase tracking-wider text-mint-ink">
                      {day.dayOfWeek}
                    </Text>
                    <Text className="text-[14px] font-bold leading-tight text-mint-ink">
                      {day.dayOfMonth}
                    </Text>
                  </View>

                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-x-2">
                      <Text
                        className="min-w-0 flex-1 text-[14px] font-semibold text-foreground"
                        numberOfLines={1}
                      >
                        {day.mealCount > 0
                          ? `${day.mealCount} ${day.mealCount === 1 ? "meal" : "meals"}`
                          : "No meals prescribed"}
                      </Text>
                      {day.isFlexibleDay ? (
                        <View className="shrink-0 rounded-full bg-sun px-2 py-0.5">
                          <Text className="text-[9px] font-bold uppercase tracking-wider text-sun-ink">
                            flexible
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="mt-0.5 text-[12px] text-muted-foreground" numberOfLines={1}>
                      {[
                        day.calories !== null ? `${formatNumber(day.calories)} kcal` : null,
                        day.mealSummary,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Nothing planned"}
                    </Text>
                  </View>

                  {hasDetail ? (
                    <Icon name="chevron-right" size={14} color="--muted-foreground" />
                  ) : null}
                </>
              );

              return hasDetail ? (
                <Pressable
                  key={day.id}
                  onPress={() => openDay(day.id)}
                  className="flex-row items-center gap-x-3 rounded-2xl border border-border bg-card p-3 active:opacity-90"
                >
                  {body}
                </Pressable>
              ) : (
                <View
                  key={day.id}
                  className="flex-row items-center gap-x-3 rounded-2xl border border-border bg-card p-3"
                >
                  {body}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

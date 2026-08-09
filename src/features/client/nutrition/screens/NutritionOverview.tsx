import {
  useGetCurrentNutritionPlanQuery,
  useGetMyNutritionPlanQuery,
  useGetMyNutritionPlansQuery,
  useGetNutritionCalendarQuery,
} from "@/api/endpoints/nutrition.endpoints";
import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { todayIso } from "@/shared/utils/dayProgress";
import { Pressable, Text, View } from "@/tw";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator } from "react-native";
import { NutritionDayCard } from "../components/NutritionDayCard";
import { TargetsCard } from "../components/TargetsCard";
import {
  calendarDayId,
  isConflict,
  normalizeDay,
  pickActivePlan,
  planDayList,
  resolveTargets,
  unwrap,
  unwrapList,
  type NutritionDay,
} from "../data";

export function NutritionOverview() {
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
    () => unwrap(fullPlanData) ?? summaryPlan,
    [fullPlanData, summaryPlan]
  );

  const weeks: any[] = useMemo(() => {
    const raw = plan?.weeks;
    return Array.isArray(raw) ? raw : [];
  }, [plan]);

  const allDays: NutritionDay[] = useMemo(() => {
    if (!plan) return [];
    // `normalizeDay` derives each day's date from the plan's start when the day
    // carries none, so today stays identifiable even when the calendar row that
    // named it is gone — which is what keeps today's targets on screen all day.
    return planDayList(plan)
      .map((day: any) => normalizeDay(day, plan, iso, todayDayId))
      .filter((day: NutritionDay | null): day is NutritionDay => day !== null);
  }, [plan, iso, todayDayId]);

  const totalWeeks = useMemo(() => {
    if (weeks.length > 0) return weeks.length;
    const fromDays = allDays.reduce((max, day) => Math.max(max, day.weekNumber), 0);
    if (fromDays > 0) return fromDays;
    const duration = Number(plan?.durationWeeks);
    return Number.isFinite(duration) && duration > 0 ? duration : 1;
  }, [weeks, allDays, plan]);

  const todayWeek = useMemo(() => {
    const today = allDays.find((day) => day.isToday);
    return today ? today.weekNumber : null;
  }, [allDays]);

  // Default to the week today falls in; an arrow tap pins the choice from then on.
  const [weekOverride, setWeekOverride] = useState<number | null>(null);
  const selectedWeek = weekOverride ?? todayWeek ?? 1;

  const days = useMemo(() => {
    if (totalWeeks <= 1) return allDays;
    const inWeek = allDays.filter((day) => day.weekNumber === selectedWeek);
    return inWeek.length > 0 ? inWeek : allDays;
  }, [allDays, selectedWeek, totalWeeks]);

  const todayDay = useMemo(() => allDays.find((day) => day.isToday) ?? null, [allDays]);
  const planTargets = useMemo(
    () => resolveTargets(todayDay ? null : plan, plan),
    [todayDay, plan]
  );

  const isLoading =
    isCurrentLoading || isPlansLoading || (Boolean(summaryPlan?.id) && isFullLoading);
  const isError = !planConflict && isPlansError && isCurrentError;

  const retry = () => {
    refetchCurrent();
    refetchPlans();
    if (summaryPlan?.id) refetchFull();
  };

  // --- Two published plans cover today. Distinct from "no plan" on purpose.
  if (planConflict) {
    return (
      <Card glass className="items-center gap-2 p-8">
        <Icon name="alert-triangle" size={30} color="--destructive" />
        <Text className="text-center text-[16px] font-bold text-foreground">
          Two plans cover today
        </Text>
        <Text className="text-center text-[13px] leading-relaxed text-muted-foreground">
          More than one published nutrition plan overlaps today, so we can&apos;t tell which
          one to show. Message your coach to have one of them adjusted.
        </Text>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color="--primary" />
      </View>
    );
  }

  if (isError) {
    return (
      <Card glass className="items-center gap-3 py-8">
        <Icon name="alert-triangle" size={28} color="--muted-foreground" />
        <Text className="text-[15px] font-semibold text-foreground">
          Couldn&apos;t load your nutrition plan
        </Text>
        <Pressable
          onPress={retry}
          accessibilityRole="button"
          className="rounded-sm bg-secondary px-4 py-2.5 active:opacity-70"
        >
          <Text className="text-[13px] font-semibold text-foreground">Retry</Text>
        </Pressable>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card glass className="items-center justify-center p-8">
        <Icon name="apple" size={36} color="--muted-foreground" />
        <Text className="mt-3 text-[16px] font-bold text-foreground">
          No Nutrition Plan Yet
        </Text>
        <Text className="mt-1 text-center text-[13px] leading-relaxed text-muted-foreground">
          Your coach hasn&apos;t published a nutrition plan for this tenant yet. Check back
          soon or ask them to get you started.
        </Text>
      </Card>
    );
  }

  return (
    <View className="gap-y-4">
      {/* Plan header */}
      <View className="px-1">
        <Text className="text-[17px] font-bold text-foreground">
          {plan?.name || "Nutrition Plan"}
        </Text>
        {plan?.description ? (
          <Text numberOfLines={2} className="mt-0.5 text-[13px] text-muted-foreground">
            {plan.description}
          </Text>
        ) : null}
      </View>

      {/* Today's targets, or the plan baseline when today isn't in the plan */}
      <TargetsCard
        targets={todayDay ? todayDay.targets : planTargets}
        title={todayDay ? "Today's target" : "Daily target"}
      />

      {/* Week switcher */}
      {totalWeeks > 1 ? (
        <Card glass className="flex-row items-center justify-between p-3">
          <Pressable
            onPress={() => setWeekOverride(Math.max(1, selectedWeek - 1))}
            disabled={selectedWeek <= 1}
            accessibilityLabel="Previous week"
            className={cn(
              "h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-70",
              selectedWeek <= 1 && "opacity-40"
            )}
          >
            <Icon name="chevron-left" size={16} color="--foreground" />
          </Pressable>

          <View className="items-center">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Nutrition
            </Text>
            <Text className="text-[16px] font-bold text-foreground">
              Week {selectedWeek} of {totalWeeks}
            </Text>
          </View>

          <Pressable
            onPress={() => setWeekOverride(Math.min(totalWeeks, selectedWeek + 1))}
            disabled={selectedWeek >= totalWeeks}
            accessibilityLabel="Next week"
            className={cn(
              "h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-70",
              selectedWeek >= totalWeeks && "opacity-40"
            )}
          >
            <Icon name="chevron-right" size={16} color="--foreground" />
          </Pressable>
        </Card>
      ) : null}

      {/* Days */}
      {days.length === 0 ? (
        <Card glass className="items-center justify-center p-8">
          <Icon name="clipboard-list" size={32} color="--muted-foreground" />
          <Text className="mt-3 text-[15px] font-semibold text-foreground">
            No days in this plan yet
          </Text>
          <Text className="mt-1 text-center text-[13px] text-muted-foreground">
            Your coach is still building it out.
          </Text>
        </Card>
      ) : (
        days.map((day) => (
          <NutritionDayCard
            key={day.id}
            day={day}
            onPress={() => router.push(`/nutrition/${day.id}` as any)}
          />
        ))
      )}
    </View>
  );
}

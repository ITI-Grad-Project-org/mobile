import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator } from "react-native";
import { NutritionDayCard } from "../components/NutritionDayCard";
import { TargetsCard } from "../components/TargetsCard";
import { resolveTargets, type NutritionDay } from "../data";
import { useActiveNutritionPlan } from "../hooks/useActiveNutritionPlan";
import { planDays, weekCountOf } from "../lib/nutritionWeek";

export function NutritionOverview() {
  const { plan, iso, todayDayId, isLoading, isError, planConflict, retry } =
    useActiveNutritionPlan();

  const allDays: NutritionDay[] = useMemo(
    // `planDays` derives each day's date from the plan's start when the day
    // carries none, so today stays identifiable even when the calendar row that
    // named it is gone — which is what keeps today's targets on screen all day.
    () => planDays(plan, { todayIso: iso, todayDayId }),
    [plan, iso, todayDayId]
  );

  const totalWeeks = useMemo(() => weekCountOf(plan, allDays), [plan, allDays]);

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

  // The plan's baseline, which every day inherits unless the coach overrode it.
  const planTargets = useMemo(() => resolveTargets(null, plan), [plan]);

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
      {/* No plan name here — the Plan tab's own header carries it while this
          segment is showing, so repeating it would just push the day list down. */}

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
            // So a day that overrides the plan's calories can say so — every
            // other day inherits this and stays quiet about it.
            baseline={planTargets}
            onPress={() => router.push(`/nutrition/${day.id}` as any)}
          />
        ))
      )}
    </View>
  );
}

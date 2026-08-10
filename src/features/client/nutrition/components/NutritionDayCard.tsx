import type { NutritionTargets } from "@/api/types";
import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Text, View } from "@/tw";
import {
  dayOutcomeLabel,
  describeDaySlots,
  formatDayChip,
  formatGrams,
  formatKcal,
  hasCalorieOverride,
  plannedMacros,
  type NutritionDay,
} from "../data";

/**
 * One day in the nutrition plan list. Tapping opens the day log.
 *
 * The row leads with the day's MENU, not its calorie target: the target is
 * inherited from the plan, so every row would otherwise read identically (and
 * repeat the targets card at the top of the screen). The target only appears
 * when the coach overrode it for this day, where it's actually news.
 */
export function NutritionDayCard({
  day,
  baseline,
  onPress,
}: {
  day: NutritionDay;
  /** The plan's baseline targets, so an overridden day can be called out. */
  baseline?: NutritionTargets | null;
  onPress: () => void;
}) {
  const { weekday, dayOfMonth } = formatDayChip(day);
  // NOT `status` — that reports adherence once the day is over, so a finished
  // day the client only partly hit reads "partial". See nutrition/data.ts.
  const isDone = day.isFinished;
  const isSkipped = !isDone && day.status === "skipped";

  const mealCount = day.meals.length;
  const title =
    mealCount > 0
      ? `${mealCount} meal${mealCount === 1 ? "" : "s"}`
      : day.isFlexibleDay
        ? "Flexible day"
        : day.isRestDay
          ? "Rest day"
          : "No meals planned";

  // Which meals, in eating order — the day's shape without naming any dish.
  const slots = describeDaySlots(day) ?? (day.isFlexibleDay ? "Log freely" : null);

  const planned = plannedMacros(day);
  const showOverride = hasCalorieOverride(day, baseline);
  const outcome = dayOutcomeLabel(day);

  // The stats line, most specific first: how the day went once it's over, then
  // an overridden target, then what the planned meals themselves add up to.
  const stats: string[] = [];
  if (outcome) {
    stats.push(outcome);
  } else if (showOverride && typeof day.targets.targetCalories === "number") {
    stats.push(`${formatKcal(day.targets.targetCalories)} kcal target`);
  } else if (planned.calories > 0) {
    stats.push(`${formatKcal(planned.calories)} kcal`);
  }
  if (!outcome && planned.proteinG > 0) {
    stats.push(`${formatGrams(planned.proteinG)} protein`);
  }

  return (
    <Card
      glass
      interactive
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 px-3.5 py-3.5",
        day.isToday && "border-primary/60",
        // Matches the training list: a settled day recedes.
        isDone && !day.isToday && "opacity-70"
      )}
    >
      {/* Date chip */}
      <View
        className={cn(
          "h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
          day.isToday ? "bg-primary" : "bg-secondary"
        )}
      >
        <Text
          className={cn(
            "text-[10px] font-semibold uppercase tracking-widest",
            day.isToday ? "text-primary-foreground" : "text-muted-foreground"
          )}
        >
          {weekday}
        </Text>
        <Text
          className={cn(
            "text-[18px] font-bold leading-tight",
            day.isToday ? "text-primary-foreground" : "text-foreground"
          )}
        >
          {dayOfMonth}
        </Text>
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          {day.isToday ? (
            <Text className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              Today
            </Text>
          ) : null}
          {showOverride ? (
            <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Adjusted target
            </Text>
          ) : null}
        </View>
        <Text numberOfLines={1} className="text-[15px] font-semibold text-foreground">
          {title}
        </Text>
        {slots ? (
          <Text numberOfLines={1} className="text-[12px] text-muted-foreground">
            {slots}
          </Text>
        ) : null}
        {stats.length > 0 ? (
          <Text
            numberOfLines={1}
            className="mt-0.5 text-[11px] font-medium text-muted-foreground opacity-80"
          >
            {stats.join(" · ")}
          </Text>
        ) : null}
      </View>

      {/* Same trailing affordance as the training list — see DayCard. */}
      <View
        className={cn(
          "h-9 w-9 shrink-0 items-center justify-center rounded-full",
          isDone ? "bg-primary" : "bg-secondary"
        )}
        accessibilityLabel={isDone ? "Completed" : isSkipped ? "Skipped" : undefined}
      >
        <Icon
          name={isDone ? "check" : isSkipped ? "x" : "chevron-right"}
          size={16}
          color={isDone ? "--primary-foreground" : "--muted-foreground"}
        />
      </View>
    </Card>
  );
}

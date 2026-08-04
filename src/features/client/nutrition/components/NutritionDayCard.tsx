import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Text, View } from "@/tw";
import { formatDayChip, formatKcal, type NutritionDay } from "../data";

/** One day in the nutrition plan list. Tapping opens the day log. */
export function NutritionDayCard({
  day,
  onPress,
}: {
  day: NutritionDay;
  onPress: () => void;
}) {
  const { weekday, dayOfMonth } = formatDayChip(day);
  const isDone = day.status === "completed";
  const isSkipped = day.status === "skipped";

  const subtitle = day.isFlexibleDay
    ? "Flexible day · log freely"
    : day.meals.length > 0
      ? `${day.meals.length} meal${day.meals.length === 1 ? "" : "s"} planned`
      : "No meals planned";

  return (
    <Card
      glass
      interactive
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 px-3.5 py-3.5",
        day.isToday && "border-primary/60"
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
        {day.isToday ? (
          <Text className="text-[10px] font-semibold uppercase tracking-widest text-primary">
            Today
          </Text>
        ) : null}
        <Text numberOfLines={1} className="text-[15px] font-semibold text-foreground">
          {typeof day.targets.targetCalories === "number"
            ? `${formatKcal(day.targets.targetCalories)} kcal`
            : "No calorie target"}
        </Text>
        <Text numberOfLines={1} className="text-[12px] text-muted-foreground">
          {subtitle}
        </Text>
      </View>

      <View className="shrink-0 flex-row items-center gap-1.5">
        {isDone ? (
          <Icon name="check" size={16} color="--primary" />
        ) : isSkipped ? (
          <Text className="text-[11px] font-semibold text-muted-foreground">Skipped</Text>
        ) : null}
        <Icon name="chevron-right" size={14} color="--muted-foreground" />
      </View>
    </Card>
  );
}

import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Text, View } from "@/tw";
import { Tone } from "@/tw/Tone";
import { dayOutcomeLabel, formatKcal } from "../data";
import { formatLongDay, type NutritionPlanDay } from "../lib/nutritionWeek";

/** The date column is a fixed width so every row's title starts on the same line. */
const DATE_COLUMN_WIDTH = 38;

interface RowProps {
  entry: NutritionPlanDay;
  onPress: () => void;
}

/** The row's second line: which meals, and what they add up to. */
function metaOf(entry: NutritionPlanDay): string {
  return [entry.slots, entry.plannedKcal > 0 ? `${formatKcal(entry.plannedKcal)} kcal` : null]
    .filter(Boolean)
    .join(" · ");
}

export function UpcomingDayRow({ entry, onPress }: RowProps) {
  const meta = metaOf(entry);

  return (
    <Card
      interactive
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}${meta ? `, ${meta}` : ""}`}
      className="flex-row items-center gap-3.5 px-4 py-3.5"
    >
      <View
        className="shrink-0 items-center border-r border-border/60 pr-3.5"
        style={{ width: DATE_COLUMN_WIDTH + 14 }}
      >
        <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {entry.dayOfWeek}
        </Text>
        <Text className="mt-0.5 text-[20px] font-black leading-none text-foreground">
          {entry.dayOfMonth}
        </Text>
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold leading-tight text-foreground" numberOfLines={1}>
          {entry.title}
        </Text>
        {meta ? (
          <Text className="mt-1 text-[12px] text-muted-foreground" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>

      <Icon name="chevron-right" size={16} color="--muted-foreground" />
    </Card>
  );
}

/**
 * A finished day: the same card, recessed, with a mint check where the date
 * column was and how the day actually went on the meta line.
 */
export function CompletedDayRow({ entry, onPress }: RowProps) {
  const result = [
    formatLongDay(entry.day.date),
    // Adherence, not progress — a "partial" day is finished too. See data.ts.
    dayOutcomeLabel(entry.day),
    entry.mealCount > 0 ? `${entry.mealCount} meal${entry.mealCount === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card
      interactive
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: true }}
      accessibilityLabel={`Logged: ${entry.title}, ${result}`}
      className="flex-row items-center gap-3.5 px-4 py-3.5 opacity-60"
    >
      <View
        className="shrink-0 items-center border-r border-border/60 pr-3.5"
        style={{ width: DATE_COLUMN_WIDTH + 14 }}
      >
        <Tone
          name="mint"
          raised
          className="h-8 w-8 items-center justify-center rounded-full shadow-soft"
        >
          <Icon name="check" size={14} color="--mint-ink" />
        </Tone>
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-[14px] font-medium leading-tight text-foreground" numberOfLines={1}>
          {entry.title}
        </Text>
        <Text className="mt-1 text-[12px] text-muted-foreground" numberOfLines={1}>
          {result}
        </Text>
      </View>

      <Icon name="chevron-right" size={16} color="--muted-foreground" />
    </Card>
  );
}

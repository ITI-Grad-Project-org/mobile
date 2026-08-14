import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Text, View } from "@/tw";
import { Tone } from "@/tw/Tone";
import { formatLongDay, type ProgramWorkout } from "@/features/shared/plans/lib/programWeek";

/** The date column is a fixed width so every row's name starts on the same line. */
const DATE_COLUMN_WIDTH = 38;

interface RowProps {
  workout: ProgramWorkout;
  onPress: () => void;
}

export function UpcomingWorkoutRow({ workout, onPress }: RowProps) {
  return (
    <Card
      glass
      interactive
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${workout.title}, ${workout.exerciseCount} exercises, about ${workout.durationMin} minutes`}
      className="flex-row items-center gap-3.5 px-4 py-3.5"
    >
      <View
        className="shrink-0 items-center border-r border-border/60 pr-3.5"
        style={{ width: DATE_COLUMN_WIDTH + 14 }}
      >
        <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {workout.dayOfWeek}
        </Text>
        <Text className="mt-0.5 text-[20px] font-black leading-none text-foreground">
          {workout.dayOfMonth}
        </Text>
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold leading-tight text-foreground" numberOfLines={1}>
          {workout.title}
        </Text>
        <Text className="mt-1 text-[12px] text-muted-foreground" numberOfLines={1}>
          {workout.exerciseCount} exercise{workout.exerciseCount === 1 ? "" : "s"} · ~
          {workout.durationMin} min
        </Text>
      </View>

      <Icon name="chevron-right" size={16} color="--muted-foreground" />
    </Card>
  );
}

/**
 * A finished workout: the same card, recessed, with a mint check where the date
 * column was and the actual result on the meta line.
 */
export function CompletedWorkoutRow({ workout, onPress }: RowProps) {
  const result = [
    formatLongDay(workout.date),
    `${workout.exerciseCount} exercise${workout.exerciseCount === 1 ? "" : "s"}`,
    workout.actualDurationMin ? `${workout.actualDurationMin} min` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card
      glass
      interactive
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: true }}
      accessibilityLabel={`Completed: ${workout.title}, ${result}`}
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
          {workout.title}
        </Text>
        <Text className="mt-1 text-[12px] text-muted-foreground" numberOfLines={1}>
          {result}
        </Text>
      </View>

      <Icon name="chevron-right" size={16} color="--muted-foreground" />
    </Card>
  );
}

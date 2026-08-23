import { Text, View } from "@/tw";

interface WeekProgressProps {
  done: number;
  total: number;
  /** Singular noun for what's being counted — "workout", "day", … */
  noun?: string;
}

/** "2 of 7 workouts done this week" over the app's standard progress track. */
export function WeekProgress({ done, total, noun = "workout" }: WeekProgressProps) {
  const percent = total > 0 ? Math.round(Math.min(1, done / total) * 100) : 0;

  return (
    <View className="gap-y-2">
      <View className="flex-row items-baseline gap-2">
        <Text className="flex-1 text-[12px] text-muted-foreground">
          <Text className="font-bold text-foreground">{done}</Text> of {total} {noun}
          {total === 1 ? "" : "s"} done this week
        </Text>
        <Text
          className="text-[12px] font-bold text-primary"
          style={{ fontVariant: ["tabular-nums"] }}
          accessibilityLabel={`${percent} percent of this week complete`}
        >
          {percent}%
        </Text>
      </View>

      <View className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <View className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </View>
    </View>
  );
}

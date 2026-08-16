import { cn } from "@/lib/utils";
import { Pressable, Text, View } from "@/tw";

import { formatLoggedAt, initialsOf } from "../lib/format";
import type { ActivityRowView } from "../lib/normalizeActivity";

/**
 * `activityType` is an open union — the live API sends `workout_set_reported`,
 * and new kinds appear over time — so exact hits are listed here and anything
 * else is matched loosely below before falling back to secondary.
 */
const TINTS: Record<string, { bg: string; fg: string }> = {
  meal: { bg: "bg-mint", fg: "text-mint-ink" },
  meal_logged: { bg: "bg-mint", fg: "text-mint-ink" },
  workout_set: { bg: "bg-lilac", fg: "text-lilac-ink" },
  workout_set_reported: { bg: "bg-lilac", fg: "text-lilac-ink" },
  checkin: { bg: "bg-secondary", fg: "text-secondary-foreground" },
};
const FALLBACK_TINT = { bg: "bg-secondary", fg: "text-secondary-foreground" };

function tintFor(type: string) {
  const exact = TINTS[type];
  if (exact) return exact;
  // The exact strings above are transcribed from prose, so match loosely too —
  // "workoutSet", "meal_logged" and friends should still land on their colour.
  if (type.includes("meal") || type.includes("food") || type.includes("nutrition")) {
    return TINTS.meal;
  }
  if (type.includes("workout") || type.includes("set") || type.includes("exercise")) {
    return TINTS.workout_set;
  }
  return FALLBACK_TINT;
}

interface ActivityRowProps {
  row: ActivityRowView;
  /** Every row but the first draws the rule above it. */
  divided: boolean;
  onPress?: () => void;
}

export function ActivityRow({ row, divided, onPress }: ActivityRowProps) {
  const tint = tintFor(row.type);

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 px-3.5 py-3.5 active:bg-secondary/50",
        divided && "border-t border-border"
      )}
    >
      <View className={cn("h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full", tint.bg)}>
        <Text className={cn("text-[12px] font-semibold", tint.fg)}>
          {initialsOf(row.clientName)}
        </Text>
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
          {row.clientName}
        </Text>
        <Text className="mt-0.5 text-[12.5px] text-muted-foreground" numberOfLines={1}>
          {row.summary}
        </Text>
      </View>

      {/* loggedAt, never trainingDate: the feed is ordered by when it was
          logged, and the two differ for anyone training around midnight. */}
      <Text className="shrink-0 text-[12px] text-muted-foreground">
        {formatLoggedAt(row.loggedAt)}
      </Text>
    </Pressable>
  );
}
ActivityRow.displayName = "ActivityRow";

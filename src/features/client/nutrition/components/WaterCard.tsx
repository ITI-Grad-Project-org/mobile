import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";

const STEP_ML = 250;
/** UpdateNutritionDayLogDto caps waterMlConsumed at 12000. */
const MAX_ML = 12000;

/**
 * Water intake. The stepper is instant and local; the caller debounces the
 * resulting PATCH so a burst of taps is one request.
 */
export function WaterCard({
  consumedMl,
  targetMl,
  disabled,
  onChange,
}: {
  consumedMl: number;
  targetMl?: number;
  disabled?: boolean;
  onChange: (ml: number) => void;
}) {
  const hasTarget = typeof targetMl === "number" && targetMl > 0;
  const pct = hasTarget ? Math.max(0, Math.min(1, consumedMl / (targetMl as number))) : 0;

  const nudge = (direction: 1 | -1) =>
    onChange(Math.min(MAX_ML, Math.max(0, consumedMl + direction * STEP_ML)));

  return (
    <Card glass className="px-4 py-3.5">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky/30">
          <Icon name="droplets" size={18} color="--sky-ink" />
        </View>

        <View className="min-w-0 flex-1">
          <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Water
          </Text>
          <Text
            className="text-[16px] font-bold text-foreground"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {(consumedMl / 1000).toFixed(2).replace(/\.?0+$/, "")} L
            {hasTarget ? (
              <Text className="text-[13px] font-normal text-muted-foreground">
                {" "}
                / {((targetMl as number) / 1000).toFixed(1)} L
              </Text>
            ) : null}
          </Text>
        </View>

        {!disabled ? (
          <View className="shrink-0 flex-row items-center gap-1.5">
            <Pressable
              onPress={() => nudge(-1)}
              disabled={consumedMl === 0}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Remove 250 millilitres of water"
              className={cn(
                "h-10 w-10 items-center justify-center rounded-full bg-secondary active:opacity-70",
                consumedMl === 0 && "opacity-40"
              )}
            >
              <Icon name="minus" size={14} color="--foreground" />
            </Pressable>
            <Pressable
              onPress={() => nudge(1)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Add 250 millilitres of water"
              className="h-10 w-10 items-center justify-center rounded-full bg-primary active:opacity-80"
            >
              <Icon name="plus" size={14} color="--primary-foreground" />
            </Pressable>
          </View>
        ) : null}
      </View>

      {hasTarget ? (
        <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
          <View
            className="h-full rounded-full bg-sky-ink"
            style={{ width: `${pct * 100}%` }}
          />
        </View>
      ) : null}
    </Card>
  );
}

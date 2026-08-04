import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { Text, View } from "@/tw";
import { router } from "expo-router";
import { formatKcal } from "../data";
import { useTodayNutrition } from "../hooks/useTodayNutrition";

/** Water is drawn as six segments, so the goal reads as six glasses. */
const WATER_SEGMENTS = 6;

export function NutritionTodayCards() {
  const { dayId, targets, consumed, waterMl, hasPlan, isLoading } = useTodayNutrition();

  if (isLoading || !hasPlan || !dayId) return null;

  const openDay = () => router.push(`/nutrition/${dayId}` as any);

  const targetCalories = targets.targetCalories;
  const caloriePct =
    typeof targetCalories === "number" && targetCalories > 0
      ? Math.max(0, Math.min(1, consumed.calories / targetCalories))
      : 0;

  const targetWaterMl = targets.targetWaterMl;
  const waterPct =
    typeof targetWaterMl === "number" && targetWaterMl > 0
      ? Math.max(0, Math.min(1, waterMl / targetWaterMl))
      : 0;
  const filledSegments = Math.round(waterPct * WATER_SEGMENTS);

  return (
    <View>
      <SectionTitle
        title="Nutrition today"
        action={<Icon name="chevron-right" size={16} color="--muted-foreground" />}
      />

      <View className="flex-row gap-3">
        {/* Calories */}
        <Card tone="peach" interactive onPress={openDay} className="flex-1" glass>
          <View className="flex-row items-center justify-between">
            <Icon name="flame" size={18} color="--peach-ink" />
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-peach-ink opacity-70">
              Calories
            </Text>
          </View>
          <Text
            className="mt-3 text-3xl font-black text-peach-ink"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {formatKcal(consumed.calories)}
          </Text>
          <Text className="text-[12px] text-peach-ink opacity-80">
            {typeof targetCalories === "number"
              ? `of ${formatKcal(targetCalories)} kcal`
              : "kcal logged"}
          </Text>
          <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-peach-ink/15">
            <View
              className="h-full rounded-full bg-peach-ink"
              style={{ width: `${caloriePct * 100}%` }}
            />
          </View>
        </Card>

        {/* Water */}
        <Card tone="sky" interactive onPress={openDay} className="flex-1" glass>
          <View className="flex-row items-center justify-between">
            <Icon name="droplets" size={18} color="--sky-ink" />
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-sky-ink opacity-70">
              Water
            </Text>
          </View>
          <Text
            className="mt-3 text-3xl font-black text-sky-ink"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {(waterMl / 1000).toFixed(1)}L
          </Text>
          <Text className="text-[12px] text-sky-ink opacity-80">
            {typeof targetWaterMl === "number"
              ? `of ${(targetWaterMl / 1000).toFixed(1)}L goal`
              : "logged today"}
          </Text>
          <View className="mt-3 flex-row gap-1">
            {Array.from({ length: WATER_SEGMENTS }, (_, i) => (
              <View
                key={i}
                className={cn(
                  "h-6 flex-1 rounded-md",
                  i < filledSegments ? "bg-sky-ink" : "bg-sky-ink/15"
                )}
              />
            ))}
          </View>
        </Card>
      </View>
    </View>
  );
}

import { Card } from "@/shared/ui/Card";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { Tone } from "@/tw/Tone";
import { formatKcal } from "../data";
import type { NutritionPlanDay } from "../lib/nutritionWeek";

interface TodayNutritionCardProps {
  entry: NutritionPlanDay;
  onLog: () => void;
  onOpen: () => void;
}

/** Today's day, promoted out of the list — the training screen's CTA card, for food. */
export function TodayNutritionCard({ entry, onLog, onOpen }: TodayNutritionCardProps) {
  return (
    <Card glass className="gap-y-3.5 border-2 border-primary bg-primary/5 p-4 shadow-pop">
      <View className="flex-row items-center gap-3">
        <Tone
          name="mint"
          raised
          className="h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-soft"
        >
          <Icon name="apple" size={20} color="--mint-ink" />
        </Tone>

        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <View className="rounded-full bg-primary px-2 py-0.5">
              <Text className="text-[9px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
                Today
              </Text>
            </View>
            <Text
              className="shrink text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
              numberOfLines={1}
            >
              Day {entry.day.dayNumber || 1}
              {entry.day.date ? ` · ${entry.dayOfWeek} ${entry.dayOfMonth}` : ""}
            </Text>
          </View>

          <Text
            className="mt-0.5 text-[18px] font-bold leading-tight text-foreground"
            numberOfLines={2}
          >
            {entry.title}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        {entry.targetKcal !== null ? (
          <>
            <View className="flex-row items-center gap-1.5">
              <Icon name="flame" size={14} color="--muted-foreground" />
              <Text className="text-[12px] text-muted-foreground">
                {formatKcal(entry.targetKcal)} kcal target
              </Text>
            </View>
            {entry.slots ? (
              <Text className="text-[12px] text-muted-foreground opacity-40">|</Text>
            ) : null}
          </>
        ) : null}
        {entry.slots ? (
          <Text className="shrink text-[12px] text-muted-foreground" numberOfLines={1}>
            {entry.slots}
          </Text>
        ) : null}
      </View>

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onLog}
          accessibilityRole="button"
          accessibilityLabel="Log today's food"
          className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-sm bg-primary active:opacity-90"
        >
          <Icon name="plus" size={13} color="--primary-foreground" />
          <Text className="text-[14px] font-bold text-primary-foreground">Log food</Text>
        </Pressable>

        <GlassButton
          onPress={onOpen}
          accessibilityLabel="See today's nutrition details"
          className="h-12 w-12 rounded-sm"
        >
          <Icon name="chevron-right" size={16} color="--foreground" />
        </GlassButton>
      </View>
    </Card>
  );
}

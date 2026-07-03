import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Text, View } from "@/tw";
import { Tone } from "@/tw/Tone";
import { TONE_ICON_COLOR, TONE_INK, type DayPlan } from "../data";

export function DayCard({
  day,
  onPress,
}: {
  day: DayPlan;
  onPress: () => void;
}) {
  return (
    <Card
      interactive
      raised
      onPress={onPress}
      className="flex-row items-center gap-4 px-4 py-6"
    >
      {/* Date column */}
      <View className="shrink-0 items-center border-r border-border/60 pr-3.5">
        <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {day.d}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-0.5 text-[26px] font-black leading-none text-foreground"
        >
          {day.date}
        </Text>
      </View>

      {/* Icon tile */}
      <Tone
        name={day.tone}
        raised
        className="h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-soft"
      >
        <Icon name={day.icon} size={22} color={TONE_ICON_COLOR[day.tone]} />
      </Tone>

      {/* Main content */}
      <View className="min-w-0 flex-1">
        <Text
          className={cn(
            "text-[10.5px] font-bold uppercase tracking-[0.14em]",
            TONE_INK[day.tone],
          )}
        >
          {day.type}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-0.5 text-[16px] font-bold leading-tight text-foreground"
        >
          {day.title}
        </Text>
        <View className="mt-1 flex-row items-center gap-2">
          <View className="flex-row items-center gap-1.5">
            <Icon name="clock" size={14} color="--muted-foreground" />
            <Text
              numberOfLines={1}
              className="text-[12px] text-muted-foreground"
            >
              {day.mins} min
            </Text>
          </View>
          <Text className="text-[12px] text-muted-foreground opacity-40">|</Text>
          <View className="flex-row items-center gap-1.5">
            <Icon name="layers" size={14} color="--muted-foreground" />
            <Text
              numberOfLines={1}
              className="text-[12px] text-muted-foreground"
            >
              {day.exercises.length} blocks
            </Text>
          </View>
        </View>
      </View>

      {/* Chevron */}
      <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Icon name="chevron-right" size={16} color="--muted-foreground" />
      </View>
    </Card>
  );
}

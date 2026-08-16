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
  const isToday = Boolean(day.isToday);
  const isDone = Boolean(day.isCompleted);
  const isSkipped = !isDone && Boolean(day.isSkipped);

  return (
    <Card
      interactive
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-4 px-4 py-6",
        // Today's card carries a ring and a tinted fill so it reads as the one
        // to act on — the "TODAY" label below repeats it without relying on color.
        isToday && "border-2 border-primary bg-primary/5 shadow-pop",
        // A finished day is settled, so it recedes rather than competing with
        // whatever is still left to do this week.
        isDone && !isToday && "opacity-70"
      )}
    >
      {/* Date column */}
      <View
        className={cn(
          "shrink-0 items-center pr-3.5",
          isToday ? "border-r border-primary/40" : "border-r border-border/60"
        )}
      >
        <Text
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            isToday ? "text-primary" : "text-muted-foreground"
          )}
        >
          {day.d}
        </Text>
        <Text
          numberOfLines={1}
          className={cn(
            "mt-0.5 text-[26px] font-black leading-none",
            isToday ? "text-primary" : "text-foreground"
          )}
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
        <View className="flex-row items-center gap-1.5">
          {isToday ? (
            <View className="rounded-full bg-primary px-2 py-0.5">
              <Text className="text-[9px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
                Today
              </Text>
            </View>
          ) : null}
          <Text
            numberOfLines={1}
            className={cn(
              "shrink text-[10.5px] font-bold uppercase tracking-[0.14em]",
              TONE_INK[day.tone],
            )}
          >
            {day.type}
          </Text>
        </View>
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

      {/* Trailing affordance — the day's state when it has one, otherwise "open me".
          It replaces the chevron rather than adding to it, so the row stays calm. */}
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

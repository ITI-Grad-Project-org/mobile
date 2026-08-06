import { Card } from "@/shared/ui/Card";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { Tone } from "@/tw/Tone";
import type { ProgramWorkout } from "../lib/programWeek";

interface TodayWorkoutCardProps {
  workout: ProgramWorkout;
  onStart: () => void;
  onOpen: () => void;
}

export function TodayWorkoutCard({ workout, onStart, onOpen }: TodayWorkoutCardProps) {
  return (
    <Card glass className="gap-y-3.5 border-2 border-primary bg-primary/5 p-4 shadow-pop">
      <View className="flex-row items-center gap-3">
        <Tone
          name="peach"
          raised
          className="h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-soft"
        >
          <Icon name="dumbbell" size={20} color="--peach-ink" />
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
              Day {workout.dayNumber}
              {workout.date ? ` · ${workout.dayOfWeek} ${workout.dayOfMonth}` : ""}
            </Text>
          </View>

          <Text className="mt-0.5 text-[18px] font-bold leading-tight text-foreground" numberOfLines={2}>
            {workout.title}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="flex-row items-center gap-1.5">
          <Icon name="layers" size={14} color="--muted-foreground" />
          <Text className="text-[12px] text-muted-foreground">
            {workout.exerciseCount} exercise{workout.exerciseCount === 1 ? "" : "s"}
          </Text>
        </View>
        <Text className="text-[12px] text-muted-foreground opacity-40">|</Text>
        <View className="flex-row items-center gap-1.5">
          <Icon name="clock" size={14} color="--muted-foreground" />
          <Text className="text-[12px] text-muted-foreground">~{workout.durationMin} min</Text>
        </View>
        {workout.focusTags.length > 0 ? (
          <>
            <Text className="text-[12px] text-muted-foreground opacity-40">|</Text>
            <Text className="shrink text-[12px] capitalize text-muted-foreground" numberOfLines={1}>
              {workout.focusTags[0]}
            </Text>
          </>
        ) : null}
      </View>

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel={`Start ${workout.title}`}
          className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-sm bg-primary active:opacity-90"
        >
          <Icon name="play" size={13} color="--primary-foreground" />
          <Text className="text-[14px] font-bold text-primary-foreground">Start workout</Text>
        </Pressable>

        <GlassButton
          onPress={onOpen}
          accessibilityLabel={`See details for ${workout.title}`}
          className="h-12 w-12 rounded-sm"
        >
          <Icon name="chevron-right" size={16} color="--foreground" />
        </GlassButton>
      </View>
    </Card>
  );
}

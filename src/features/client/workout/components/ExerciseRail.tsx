import { cn } from "@/lib/utils";
import { Pressable, Text, View } from "@/tw";

export interface RailSegment {
  /** 0..1 — share of this exercise's sets that are logged. */
  progress: number;
  label: string;
}

interface ExerciseRailProps {
  segments: RailSegment[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/**
 * The whole-workout overview that replaces the endless scroll: one filling track
 * per exercise, tappable to jump.
 */
export function ExerciseRail({ segments, activeIndex, onSelect }: ExerciseRailProps) {
  return (
    <View className="flex-row gap-1.5">
      {segments.map((segment, index) => {
        const isActive = index === activeIndex;
        return (
          <Pressable
            key={segment.label}
            onPress={() => onSelect(index)}
            hitSlop={{ top: 12, bottom: 12 }}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Go to exercise ${index + 1}, ${Math.round(
              segment.progress * 100
            )} percent logged`}
            className="flex-1 gap-1 active:opacity-70"
          >
            <View className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <View
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round(Math.min(1, segment.progress) * 100)}%` }}
              />
            </View>
            <Text
              className={cn(
                "text-[9px] font-semibold uppercase tracking-wider",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
              numberOfLines={1}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

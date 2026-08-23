import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { Animated } from "@/tw/animated";
import { useEffect, useRef } from "react";
// The tw ScrollView wrapper doesn't forward a ref, and the rail has to scroll
// itself to the active pill — so this one is the plain RN ScrollView (styled
// with contentContainerStyle, since className doesn't cross that boundary).
import { ScrollView } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export interface RailSegment {
  /** 0..1 — share of this exercise's sets that are logged. */
  progress: number;
  /** The exercise name, shown under the pill number. */
  label: string;
}

interface ExerciseRailProps {
  segments: RailSegment[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/** Roughly one pill; only used to keep the active pill inside the viewport. */
const PILL_WIDTH = 132;

/**
 * The whole-workout overview that replaces the endless scroll: one card per
 * exercise, tappable to jump. The active exercise is the loud one — everything
 * else recedes so the current lift is unmistakable at a glance.
 */
export function ExerciseRail({ segments, activeIndex, onSelect }: ExerciseRailProps) {
  const scrollRef = useRef<ScrollView>(null);
  const itemOffsets = useRef<number[]>([]);
  const viewportWidth = useRef(0);

  // Keep the active pill in view as the client swipes through the workout.
  useEffect(() => {
    const x = itemOffsets.current[activeIndex];
    if (x === undefined || viewportWidth.current === 0) return;
    scrollRef.current?.scrollTo({
      x: Math.max(0, x - viewportWidth.current / 2 + PILL_WIDTH / 2),
      animated: true,
    });
  }, [activeIndex]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(event) => {
        viewportWidth.current = event.nativeEvent.layout.width;
      }}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
    >
      {segments.map((segment, index) => (
        <RailPill
          key={`${index}-${segment.label}`}
          index={index}
          segment={segment}
          isActive={index === activeIndex}
          onLayoutX={(x) => {
            itemOffsets.current[index] = x;
          }}
          onPress={() => onSelect(index)}
        />
      ))}
    </ScrollView>
  );
}

interface RailPillProps {
  index: number;
  segment: RailSegment;
  isActive: boolean;
  onLayoutX: (x: number) => void;
  onPress: () => void;
}

function RailPill({ index, segment, isActive, onLayoutX, onPress }: RailPillProps) {
  const progress = Math.max(0, Math.min(1, segment.progress));
  const isDone = progress >= 1;

  // The fill grows rather than jumping, so logging a set reads as movement.
  const fill = useSharedValue(progress);
  useEffect(() => {
    fill.set(withTiming(progress, { duration: 260 }));
  }, [fill, progress]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  // Emphasis is opacity only — scaling a 1px border makes it shimmer and blur.
  const emphasis = useSharedValue(isActive ? 1 : 0);
  useEffect(() => {
    emphasis.set(withTiming(isActive ? 1 : 0, { duration: 180 }));
  }, [emphasis, isActive]);
  const pillStyle = useAnimatedStyle(() => ({ opacity: 0.55 + emphasis.get() * 0.45 }));

  return (
    <Pressable
      onPress={onPress}
      onLayout={(event) => onLayoutX(event.nativeEvent.layout.x)}
      hitSlop={{ top: 8, bottom: 8 }}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`Exercise ${index + 1}, ${segment.label}, ${Math.round(
        progress * 100
      )} percent logged`}
      className="active:opacity-80"
    >
      {/* The border is always 1px so nothing reflows on selection; inactive
          pills just hide theirs, which keeps the rail from reading as a row of
          hard boxes. */}
      <Animated.View
        style={pillStyle}
        className={cn(
          "w-[132px] gap-1.5 overflow-hidden rounded-sm border px-3 py-2.5",
          isActive
            ? "border-primary/50 bg-primary/12"
            : "border-transparent bg-secondary/40"
        )}
      >
        <View className="flex-row items-center gap-1.5">
          <View
            className={cn(
              "h-4 w-4 items-center justify-center rounded-full",
              isDone ? "bg-primary" : isActive ? "bg-primary" : "bg-muted-foreground/25"
            )}
          >
            {isDone ? (
              <Icon name="check" size={9} color="--primary-foreground" />
            ) : (
              <Text
                className={cn(
                  "text-[9px] font-bold",
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {index + 1}
              </Text>
            )}
          </View>
          <Text
            className={cn(
              "flex-1 text-[11px] font-semibold",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
            numberOfLines={1}
          >
            {segment.label}
          </Text>
        </View>

        <View className="h-1 overflow-hidden rounded-full bg-foreground/10">
          <Animated.View className="h-full rounded-full bg-primary" style={fillStyle} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

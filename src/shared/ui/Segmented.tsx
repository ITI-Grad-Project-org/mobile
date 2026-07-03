import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import Reanimated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { cn } from "@/lib/utils";
import { Pressable, Text, View } from "@/tw";

const AnimatedView = Reanimated.createAnimatedComponent(View);

// Total horizontal padding of the track (p-1 => 4px each side).
const TRACK_PADDING = 8;

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  duration = 250,
  labelClassName,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  duration?: number;
  labelClassName?: string;
}) {
  const [trackWidth, setTrackWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) =>
    setTrackWidth(e.nativeEvent.layout.width);

  const segmentWidth =
    trackWidth > 0 ? (trackWidth - TRACK_PADDING) / options.length : 0;
  const index = options.findIndex((o) => o.value === value);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: withTiming(index * segmentWidth, { duration }) },
    ],
  }));

  return (
    <View
      onLayout={onLayout}
      className="relative flex-row rounded-full bg-secondary p-1"
    >
      {segmentWidth > 0 ? (
        <AnimatedView
          style={[{ width: segmentWidth }, indicatorStyle]}
          className="absolute bottom-1 left-1 top-1 rounded-full bg-card shadow-soft"
        />
      ) : null}
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          className="flex-1 items-center rounded-full py-2"
        >
          <Text
            className={cn(
              "text-[13px] font-medium",
              option.value === value
                ? "text-foreground"
                : "text-muted-foreground",
              labelClassName,
            )}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

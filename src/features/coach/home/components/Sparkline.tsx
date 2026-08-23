import { cn } from "@/lib/utils";
import { fillHeightClass } from "@/shared/ui/ProgressTrack";
import { View } from "@/tw";

interface SparklineProps {
  /** Non-negative values; the tallest sets the scale. */
  data: number[];
  className?: string;
}

/**
 * A micro bar-spark drawn with Views. react-native-svg isn't installed and
 * adding it would force a new native build, so this trades the polyline for
 * bars rather than the dependency.
 *
 * Heights come from the quantised percentage classes (see ProgressTrack) —
 * a computed `h-[${n}px]` would never reach the compiler.
 */
export function Sparkline({ data, className }: SparklineProps) {
  const max = data.reduce((acc, value) => (value > acc ? value : acc), 0);
  if (data.length === 0 || max <= 0) return null;

  return (
    <View className={cn("flex-row items-end gap-[2px]", className)} pointerEvents="none">
      {data.map((value, i) => (
        <View
          key={i}
          className={cn("flex-1 rounded-t-[1px] bg-success", fillHeightClass(value / max))}
        />
      ))}
    </View>
  );
}
Sparkline.displayName = "Sparkline";

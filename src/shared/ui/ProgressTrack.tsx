import { cn } from "@/lib/utils";
import { View } from "@/tw";

/**
 * Widths have to be literal class names for the compiler to see them, so the
 * ratio is quantised to twentieths rather than interpolated into a style.
 */
const FILL_WIDTHS = [
  "w-0",
  "w-[5%]",
  "w-[10%]",
  "w-[15%]",
  "w-[20%]",
  "w-[25%]",
  "w-[30%]",
  "w-[35%]",
  "w-[40%]",
  "w-[45%]",
  "w-[50%]",
  "w-[55%]",
  "w-[60%]",
  "w-[65%]",
  "w-[70%]",
  "w-[75%]",
  "w-[80%]",
  "w-[85%]",
  "w-[90%]",
  "w-[95%]",
  "w-full",
] as const;

/** Height twin of FILL_WIDTHS, for charts that grow upward inside a fixed track. */
const FILL_HEIGHTS = [
  "h-0",
  "h-[5%]",
  "h-[10%]",
  "h-[15%]",
  "h-[20%]",
  "h-[25%]",
  "h-[30%]",
  "h-[35%]",
  "h-[40%]",
  "h-[45%]",
  "h-[50%]",
  "h-[55%]",
  "h-[60%]",
  "h-[65%]",
  "h-[70%]",
  "h-[75%]",
  "h-[80%]",
  "h-[85%]",
  "h-[90%]",
  "h-[95%]",
  "h-full",
] as const;

/** A 0–1 ratio as a twentieth, clamped. Both tables are indexed by this. */
function quantiseStep(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  return Math.max(0, Math.min(20, Math.round(Math.min(1, ratio) * 20)));
}

/** The class for a 0–1 ratio, clamped. Exported for callers that draw their own track. */
export function fillWidthClass(ratio: number): string {
  return FILL_WIDTHS[quantiseStep(ratio)];
}

/**
 * The height class for a 0–1 ratio, clamped. Percentages resolve against a
 * parent with a definite height, so the caller must give the track one
 * (e.g. `h-[78px]`).
 */
export function fillHeightClass(ratio: number): string {
  return FILL_HEIGHTS[quantiseStep(ratio)];
}

interface ProgressTrackProps {
  /** 0–1; anything outside is clamped. */
  value: number;
  /** Fill colour, e.g. "bg-mint". */
  fillClassName?: string;
  /** Track geometry and colour, e.g. "h-1 bg-foreground/8". */
  className?: string;
}

export function ProgressTrack({
  value,
  fillClassName = "bg-primary",
  className,
}: ProgressTrackProps) {
  return (
    <View className={cn("h-1 overflow-hidden rounded-full bg-foreground/8", className)}>
      <View className={cn("h-full rounded-full", fillClassName, fillWidthClass(value))} />
    </View>
  );
}

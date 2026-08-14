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

/** The class for a 0–1 ratio, clamped. Exported for callers that draw their own track. */
export function fillWidthClass(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return FILL_WIDTHS[0];
  const step = Math.round(Math.min(1, ratio) * 20);
  return FILL_WIDTHS[Math.max(0, Math.min(20, step))];
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

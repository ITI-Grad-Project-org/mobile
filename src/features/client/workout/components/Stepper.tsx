import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";

interface StepperProps {
  /** `null` means "not known yet" — rendered as an em dash. */
  value: number | null;
  unit: string;
  step: number;
  min?: number;
  max?: number;
  /** Used when stepping up from an unknown value. */
  fallback: number;
  format?: (value: number) => string;
  disabled?: boolean;
  tone?: "default" | "done";
  label: string;
  onChange: (value: number) => void;
}

export function Stepper({
  value,
  unit,
  step,
  min = 0,
  max = 9999,
  fallback,
  format = String,
  disabled,
  tone = "default",
  label,
  onChange,
}: StepperProps) {
  const isDone = tone === "done";

  const nudge = (direction: 1 | -1) => {
    if (value === null) return onChange(fallback);
    const next = Math.round((value + direction * step) * 100) / 100;
    onChange(Math.min(max, Math.max(min, next)));
  };

  return (
    <View
      className={cn(
        "flex-1 flex-row items-center justify-between rounded-sm border px-1",
        isDone ? "border-primary/30 bg-primary/10" : "border-border bg-secondary"
      )}
    >
      <Pressable
        onPress={() => nudge(-1)}
        disabled={disabled}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        className={cn(
          "h-11 w-11 items-center justify-center rounded-sm active:opacity-60",
          disabled && "opacity-40"
        )}
      >
        <Icon name="minus" size={13} color={isDone ? "--primary" : "--muted-foreground"} />
      </Pressable>

      <View className="flex-1 items-center py-1.5">
        <Text
          className={cn(
            "text-[19px] font-bold tracking-tight",
            isDone ? "text-primary" : "text-foreground"
          )}
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {value === null ? "—" : format(value)}
        </Text>
        <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {unit}
        </Text>
      </View>

      <Pressable
        onPress={() => nudge(1)}
        disabled={disabled}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        className={cn(
          "h-11 w-11 items-center justify-center rounded-sm active:opacity-60",
          disabled && "opacity-40"
        )}
      >
        <Icon name="plus" size={13} color={isDone ? "--primary" : "--muted-foreground"} />
      </Pressable>
    </View>
  );
}

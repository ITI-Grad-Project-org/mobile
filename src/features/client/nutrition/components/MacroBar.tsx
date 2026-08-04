import { cn } from "@/lib/utils";
import { Text, View } from "@/tw";

export function MacroBar({
  label,
  consumed,
  target,
  unit,
  variant = "default",
  className,
}: {
  label: string;
  consumed: number;
  target?: number;
  unit: string;
  variant?: "default" | "mint";
  className?: string;
}) {
  const onMint = variant === "mint";
  const hasTarget = typeof target === "number" && target > 0;
  const ratio = hasTarget ? consumed / (target as number) : 0;
  // Over target still fills the bar; the number below carries the overshoot.
  const pct = Math.max(0, Math.min(1, ratio));
  const isOver = hasTarget && ratio > 1.05;

  const mutedText = onMint
    ? "text-mint-ink opacity-70"
    : "text-muted-foreground";
  const strongText = onMint ? "text-mint-ink" : "text-foreground";

  return (
    <View className={cn("flex-1 gap-1", className)}>
      <Text
        className={cn(
          "text-[10px] font-semibold uppercase tracking-widest",
          mutedText
        )}
      >
        {label}
      </Text>
      <View
        className={cn(
          "h-1.5 overflow-hidden rounded-full",
          onMint ? "bg-mint-ink/20" : "bg-foreground/10"
        )}
      >
        <View
          className={cn(
            "h-full rounded-full",
            isOver ? "bg-destructive" : onMint ? "bg-mint-ink" : "bg-primary"
          )}
          style={{ width: `${pct * 100}%` }}
        />
      </View>
      <Text
        className={cn("text-[11.5px] font-semibold", strongText)}
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {Math.round(consumed)}
        <Text className={cn("text-[11.5px] font-normal", mutedText)}>
          {hasTarget ? ` / ${Math.round(target as number)}${unit}` : unit}
        </Text>
      </Text>
    </View>
  );
}

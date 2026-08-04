import { GlassButton } from "@/shared/ui/GlassButton";
import { Text, View } from "@/tw";
import { formatClock } from "../hooks/useRestTimer";

interface RestDockProps {
  remaining: number;
  total: number;
  onExtend: () => void;
  onSkip: () => void;
}

/** The between-sets card: countdown, a depleting bar, and the two escapes. */
export function RestDock({ remaining, total, onExtend, onSkip }: RestDockProps) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;

  return (
    <View className="rounded-lg border border-primary/30 bg-primary/10 p-3.5 gap-y-2.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-primary">
          Rest
        </Text>
        <Text
          className="text-[28px] font-bold leading-tight text-primary"
          style={{ fontVariant: ["tabular-nums"] }}
          accessibilityLabel={`${remaining} seconds of rest remaining`}
        >
          {formatClock(remaining)}
        </Text>
      </View>

      <View className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </View>

      <View className="flex-row gap-2">
        <GlassButton
          onPress={onExtend}
          accessibilityLabel="Add 30 seconds of rest"
          className="h-11 flex-1 rounded-sm border border-primary/30"
        >
          <Text className="text-[13px] font-semibold text-primary">+30s</Text>
        </GlassButton>
        <GlassButton
          onPress={onSkip}
          accessibilityLabel="Skip rest"
          className="h-11 flex-1 rounded-sm border border-border"
        >
          <Text className="text-[13px] font-semibold text-foreground">Skip</Text>
        </GlassButton>
      </View>
    </View>
  );
}

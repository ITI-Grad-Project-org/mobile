import { cn } from "@/lib/utils";
import { Text, View } from "@/tw";
import type { PlanLifecycle } from "../lib/normalizePlan";

/**
 * Status is a dot and a word — never a filled pill. Tinted fills belong to the
 * category avatar alone, so the two signals stop competing on the card.
 */
const LIFECYCLE = {
  published: { dot: "bg-success", label: "text-success", opacity: "" },
  draft: { dot: "bg-muted-foreground", label: "text-muted-foreground", opacity: "" },
  archived: { dot: "bg-muted-foreground", label: "text-muted-foreground", opacity: "opacity-70" },
  cancelled: { dot: "bg-muted-foreground", label: "text-muted-foreground", opacity: "opacity-70" },
} as const;

export function StatusIndicator({
  status,
  phase,
}: {
  status: PlanLifecycle;
  /** Appended as "PUBLISHED · ACTIVE" when the plan is actually running. */
  phase?: string | null;
}) {
  const tone = LIFECYCLE[status];
  const label = phase ? `${status} · ${phase}` : status;

  return (
    <View className={cn("flex-row items-center gap-1.5", tone.opacity)}>
      <View className={cn("w-1.25 h-1.25 rounded-full", tone.dot)} />
      <Text
        className={cn("text-[11.5px] font-semibold uppercase tracking-widest", tone.label)}
      >
        {label}
      </Text>
    </View>
  );
}

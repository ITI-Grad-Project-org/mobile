import { ProgressTrack } from "@/shared/ui/ProgressTrack";
import { StatCell } from "@/shared/ui/StatCell";
import { Text, View } from "@/tw";
import type { PlanSchedule } from "../lib/coachPlanDays";
import { formatDayDate } from "../lib/coachPlanDays";
import { formatNumber, type CoachPlan } from "../lib/normalizePlan";
import { StatusIndicator } from "./StatusIndicator";

export interface PlanTimelineStat {
  value: string;
  unit?: string;
  label: string;
}

interface PlanTimelineCardProps {
  plan: CoachPlan;
  schedule: PlanSchedule;
  /** Three cells: sessions/rest/frequency, or kcal/protein/meals. */
  stats: PlanTimelineStat[];
}

/**
 * Where the plan stands, in one card.
 *
 * Duration, goal and level already sit in the hero chips, so nothing is
 * repeated here — this answers "is it running, and how far in".
 */
export function PlanTimelineCard({ plan, schedule, stats }: PlanTimelineCardProps) {
  const fill = plan.kind === "training" ? "bg-lilac" : "bg-mint";
  // A draft has no run to show: it isn't on a client's calendar yet.
  const scheduled = plan.status !== "draft" && schedule.totalDays > 0 && !!schedule.startDate;

  return (
    <View className="gap-3 rounded-lg border border-border bg-card px-3.75 py-3.5">
      <View className="flex-row items-center justify-between gap-3">
        <StatusIndicator status={plan.lifecycle} phase={plan.schedulePhase} />

        {scheduled ? (
          <Text className="text-[12.5px] text-muted-foreground">
            Day <Text className="font-semibold text-foreground">{schedule.elapsedDays}</Text> of{" "}
            <Text className="font-semibold text-foreground">{schedule.totalDays}</Text>
          </Text>
        ) : null}
      </View>

      {scheduled ? (
        <View className="gap-1.5">
          <ProgressTrack value={schedule.ratio} fillClassName={fill} />
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">
              {formatDayDate(schedule.startDate) ?? "—"}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {formatDayDate(schedule.endDate) ?? "—"}
            </Text>
          </View>
        </View>
      ) : (
        <Text className="text-xs text-muted-foreground">Not scheduled yet</Text>
      )}

      <View className="flex-row border-t border-border pt-2.75">
        {stats.map((stat) => (
          <StatCell key={stat.label} value={stat.value} unit={stat.unit} label={stat.label} />
        ))}
      </View>
    </View>
  );
}

/** Shared formatting so a missing number never renders as "null". */
export function statValue(value: number | null | undefined): string {
  return typeof value === "number" ? formatNumber(value) : "—";
}

import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { ProgressTrack } from "@/shared/ui/ProgressTrack";
import { StatCell } from "@/shared/ui/StatCell";
import { Pressable, Text, View } from "@/tw";
import { planCompleteness } from "../lib/planCompleteness";
import type { CoachPlan } from "../lib/normalizePlan";
import { CategoryAvatar } from "./CategoryAvatar";
import { ClientAvatar } from "./ClientAvatar";
import { StatusIndicator } from "./StatusIndicator";

interface PlanCardProps {
  plan: CoachPlan;
  onPress: () => void;
  /** Draft cards route here instead — "finish this plan". */
  onContinue?: () => void;
}

export function PlanCard({ plan, onPress, onContinue }: PlanCardProps) {
  if (plan.status === "draft") {
    return <DraftPlanCard plan={plan} onPress={onPress} onContinue={onContinue} />;
  }

  return (
    <Card
      interactive
      glass
      onPress={onPress}
      accessibilityRole="button"
      className={cn("gap-3 rounded-lg px-3.75 py-3.5", plan.isArchived && "opacity-70")}
    >
      {/* Row 1 — identity */}
      <View className="flex-row items-start gap-3">
        <CategoryAvatar type={plan.kind} />
        <View className="min-w-0 flex-1 gap-1.5">
          <Text
            className="text-[17.5px] font-semibold leading-tight text-foreground"
            numberOfLines={2}
          >
            {plan.name}
          </Text>
          <StatusIndicator status={plan.lifecycle} />
        </View>
      </View>

      {/* Row 2 — the numbers */}
      <View className="flex-row border-t border-border pt-2.75">
        {plan.kind === "nutrition" ? (
          <>
            <StatCell value={formatValue(plan.targets?.calories)} label="kcal" />
            <StatCell
              value={formatValue(plan.targets?.proteinG)}
              unit={plan.targets?.proteinG != null ? "g" : undefined}
              label="protein"
            />
            <StatCell value={String(plan.durationWeeks)} unit="wk" label="duration" />
          </>
        ) : (
          <>
            <StatCell value={String(plan.durationWeeks)} unit="wk" label="duration" />
            <StatCell value={capitalize(plan.goal) ?? "—"} label="goal" className="flex-[1.4]" />
            <StatCell value={shortLevel(plan.difficulty)} label="level" />
          </>
        )}
      </View>

      {/* Row 3 — owner */}
      <View className="flex-row items-center gap-2">
        <ClientAvatar client={plan.client} />
        <Text className="min-w-0 flex-1 text-[13.5px] text-muted-foreground" numberOfLines={1}>
          {plan.client?.name ?? "No client linked"}
        </Text>
        <Icon name="chevron-right" size={16} color="--muted-foreground" className="opacity-70" />
      </View>
    </Card>
  );
}

function DraftPlanCard({ plan, onPress, onContinue }: PlanCardProps) {
  const { completedSteps, totalSteps, caption } = planCompleteness(plan);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="gap-3 rounded-lg border border-dashed border-border bg-background px-3.75 py-3.5 active:opacity-90"
    >
      <View className="flex-row items-start gap-3">
        <CategoryAvatar type={plan.kind} className="opacity-75" />
        <View className="min-w-0 flex-1 gap-1.5">
          <Text
            className="text-[17.5px] font-semibold leading-tight text-foreground/70"
            numberOfLines={2}
          >
            {plan.name}
          </Text>
          <StatusIndicator status={plan.lifecycle} />
        </View>
      </View>

      <View className="gap-2">
        {/* Progress track: how much of the draft is filled in. */}
        <ProgressTrack
          value={totalSteps > 0 ? completedSteps / totalSteps : 0}
          fillClassName="bg-muted-foreground"
          className="h-0.75 bg-border"
        />

        <View className="flex-row items-center justify-between">
          <Text className="text-[12.5px] text-muted-foreground" numberOfLines={1}>
            {caption}
          </Text>
          {onContinue ? (
            <Pressable
              onPress={onContinue}
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="active:opacity-70"
            >
              <Text className="text-[12.5px] font-semibold text-primary">Continue</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function formatValue(value: number | null | undefined): string {
  return typeof value === "number" ? value.toLocaleString() : "—";
}

function capitalize(value: string | null): string | null {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : null;
}

/** "intermediate" is too wide for a third of a card — "Interm." isn't. */
function shortLevel(difficulty: string | null): string {
  if (!difficulty) return "—";
  const label = capitalize(difficulty) as string;
  return label.length > 8 ? `${label.slice(0, 6)}.` : label;
}

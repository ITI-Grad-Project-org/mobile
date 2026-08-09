import type { MealOutcome } from "@/api/types";
import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { OUTCOME_LABEL } from "../data";

const OUTCOMES: readonly MealOutcome[] = ["completed", "partial", "skipped"] as const;

/**
 * The three-way "did you eat it" control. Shared by the meal card and the detail
 * sheet so an outcome can be set from either without them drifting apart.
 */
export function MealOutcomePicker({
  outcome,
  mealName,
  disabled,
  isSaving,
  onSetOutcome,
}: {
  /** The effective outcome — a local optimistic override, or the server's. */
  outcome: MealOutcome | null;
  /** Only for the accessibility label, so each button reads in context. */
  mealName: string;
  disabled?: boolean;
  isSaving?: boolean;
  onSetOutcome: (outcome: MealOutcome) => void;
}) {
  if (disabled) {
    return (
      <View className="flex-row items-center gap-1.5">
        <Icon
          name={outcome === "skipped" ? "x" : "check"}
          size={12}
          color="--muted-foreground"
        />
        <Text className="text-[12px] text-muted-foreground">
          {outcome ? OUTCOME_LABEL[outcome] : "No outcome recorded"}
        </Text>
      </View>
    );
  }

  return (
    <View className={cn("flex-row gap-2", isSaving && "opacity-60")}>
      {OUTCOMES.map((option) => {
        const selected = outcome === option;
        return (
          <Pressable
            key={option}
            onPress={() => onSetOutcome(option)}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${OUTCOME_LABEL[option]} — ${mealName}`}
            className={cn(
              "h-10 flex-1 items-center justify-center rounded-sm border active:opacity-70",
              selected
                ? option === "skipped"
                  ? "border-border bg-secondary"
                  : "border-primary/40 bg-primary/10"
                : "border-border bg-transparent"
            )}
          >
            <Text
              className={cn(
                "text-[12.5px] font-semibold",
                selected && option !== "skipped"
                  ? "text-primary"
                  : selected
                    ? "text-foreground"
                    : "text-muted-foreground"
              )}
            >
              {OUTCOME_LABEL[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

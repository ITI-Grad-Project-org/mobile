import type { MealOutcome } from "@/api/types";
import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import {
  formatGrams,
  formatKcal,
  OUTCOME_LABEL,
  type PlannedMeal,
} from "../data";

const OUTCOMES: readonly MealOutcome[] = ["completed", "partial", "skipped"] as const;

/** A coach-prescribed meal, with the three-way outcome control the log needs. */
export function MealCard({
  meal,
  outcome,
  disabled,
  isSaving,
  onSetOutcome,
}: {
  meal: PlannedMeal;
  /** The effective outcome — a local optimistic override, or the server's. */
  outcome: MealOutcome | null;
  disabled?: boolean;
  isSaving?: boolean;
  onSetOutcome: (outcome: MealOutcome) => void;
}) {
  const { macros } = meal;

  return (
    <Card glass className="gap-3 px-3.5 py-3.5">
      <View className="flex-row items-center gap-3">
        {meal.photoUrl ? (
          <Image source={meal.photoUrl} className="h-14 w-14 shrink-0 rounded-2xl bg-secondary" />
        ) : (
          <View className="h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/40 bg-secondary/80">
            <Icon name="apple" size={22} color="--primary" />
          </View>
        )}

        <View className="min-w-0 flex-1">
          {meal.suggestedTime ? (
            <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {meal.suggestedTime}
            </Text>
          ) : null}
          <Text numberOfLines={1} className="text-[15px] font-semibold text-foreground">
            {meal.name}
          </Text>
          {macros.calories > 0 ? (
            <Text className="text-[12px] text-muted-foreground">
              {formatKcal(macros.calories)} kcal · P {formatGrams(macros.proteinG)} · C{" "}
              {formatGrams(macros.carbsG)} · F {formatGrams(macros.fatG)}
            </Text>
          ) : null}
        </View>
      </View>

      {meal.items.length > 0 ? (
        <View className="gap-0.5">
          {meal.items.map((line, index) => (
            <Text key={`${meal.id}-item-${index}`} className="text-[12px] text-muted-foreground">
              · {line}
            </Text>
          ))}
        </View>
      ) : null}

      {meal.coachNotes ? (
        <Text className="text-[12px] leading-relaxed text-muted-foreground">
          <Text className="font-semibold text-foreground">Coach note: </Text>
          {meal.coachNotes}
        </Text>
      ) : null}

      {disabled ? (
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
      ) : (
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
                accessibilityLabel={`${OUTCOME_LABEL[option]} — ${meal.name}`}
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
      )}
    </Card>
  );
}

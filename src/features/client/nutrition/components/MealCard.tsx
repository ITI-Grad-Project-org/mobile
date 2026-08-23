import type { MealOutcome } from "@/api/types";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { formatKcal, type PlannedMeal } from "../data";
import { MealOutcomePicker } from "./MealOutcomePicker";

/**
 * A coach-prescribed meal, trimmed to what you need to decide "did I eat this":
 * photo, name, time and calories, plus the outcome control. The ingredients,
 * macro split and coach note live one tap away in the detail sheet.
 */
export function MealCard({
  meal,
  outcome,
  disabled,
  isSaving,
  onSetOutcome,
  onOpenDetails,
}: {
  meal: PlannedMeal;
  /** The effective outcome — a local optimistic override, or the server's. */
  outcome: MealOutcome | null;
  disabled?: boolean;
  isSaving?: boolean;
  onSetOutcome: (outcome: MealOutcome) => void;
  onOpenDetails: () => void;
}) {
  const { macros } = meal;

  const summary = [
    meal.suggestedTime,
    macros.calories > 0 ? `${formatKcal(macros.calories)} kcal` : null,
    meal.items.length > 0
      ? `${meal.items.length} item${meal.items.length === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card glass className="gap-3 px-3.5 py-3.5">
      <Pressable
        onPress={onOpenDetails}
        accessibilityRole="button"
        accessibilityLabel={`${meal.name} — see details`}
        className="flex-row items-center gap-3 active:opacity-70"
      >
        {meal.photoUrl ? (
          <Image
            source={meal.photoUrl}
            className="h-14 w-14 shrink-0 rounded-2xl bg-secondary"
          />
        ) : (
          <View className="h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/40 bg-secondary/80">
            <Icon name="apple" size={22} color="--primary" />
          </View>
        )}

        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[15px] font-semibold text-foreground">
            {meal.name}
          </Text>
          {summary ? (
            <Text numberOfLines={1} className="mt-0.5 text-[12px] text-muted-foreground">
              {summary}
            </Text>
          ) : null}
        </View>

        <Icon name="chevron-right" size={14} color="--muted-foreground" />
      </Pressable>

      <MealOutcomePicker
        outcome={outcome}
        mealName={meal.name}
        disabled={disabled}
        isSaving={isSaving}
        onSetOutcome={onSetOutcome}
      />
    </Card>
  );
}

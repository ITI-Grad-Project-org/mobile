import type { MealOutcome } from "@/api/types";
import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { useState } from "react";
import { Modal } from "react-native";
import { formatKcal, SLOT_LABEL, type MealItem, type PlannedMeal } from "../data";

export function LogPrescribedModal({
  meal,
  outcome,
  isLoading,
  error,
  onClose,
  onConfirm,
}: {
  meal: PlannedMeal;
  outcome: MealOutcome;
  isLoading?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (items: MealItem[]) => void;
}) {
  const isPartial = outcome === "partial";

  // Indices, since an ingredient line carries no id of its own. "Ate it" means
  // the whole prescription, so it starts ticked; "Partly" is the client's to
  // fill in — pre-ticking there would be the app guessing what they left.
  const [selected, setSelected] = useState<number[]>(() =>
    outcome === "partial" ? [] : meal.items.map((_, index) => index)
  );

  const toggle = (index: number) =>
    setSelected((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );

  const chosen = meal.items.filter((_, index) => selected.includes(index));
  const calories = chosen.reduce((total, item) => total + item.macros.calories, 0);
  const allSelected = chosen.length === meal.items.length;

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-6">
        <Pressable className="absolute inset-0 bg-black/50" onPress={onClose} />

        <View className="w-full gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-pop">
          <View>
            <Text className="text-[19px] font-bold text-foreground">
              {isPartial ? "What did you eat?" : "Add it to your food diary?"}
            </Text>
            <Text className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {isPartial
                ? `Tick what you actually ate — only those lines go into today's ${SLOT_LABEL[meal.slot].toLowerCase()} diary.`
                : `${SLOT_LABEL[meal.slot]} is marked as eaten. Logging the prescribed food is what moves today's calories — untick anything you swapped out.`}
            </Text>
          </View>

          <ScrollView
            className="max-h-64"
            contentContainerClassName="rounded-2xl bg-secondary/60 px-4 py-1"
            showsVerticalScrollIndicator={false}
          >
            {meal.items.map((item, index) => {
              const isOn = selected.includes(index);
              return (
                <Pressable
                  key={`${meal.id}-confirm-${index}`}
                  onPress={() => toggle(index)}
                  disabled={isLoading}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isOn }}
                  accessibilityLabel={item.name}
                  className={cn(
                    "flex-row items-center gap-3 py-2.5 active:opacity-70",
                    index > 0 && "border-t border-border/40"
                  )}
                >
                  <View
                    className={cn(
                      "h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      isOn ? "border-primary bg-primary" : "border-border bg-transparent"
                    )}
                  >
                    {isOn ? <Icon name="check" size={12} color="--primary-foreground" /> : null}
                  </View>
                  <Text
                    numberOfLines={1}
                    className={cn(
                      "flex-1 text-[13.5px]",
                      isOn ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {item.name}
                  </Text>
                  {item.amount ? (
                    <Text
                      className="text-[13px] text-muted-foreground"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {item.amount}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="flex-row items-center justify-between rounded-sm bg-secondary px-3 py-2.5">
            <Text className="text-[12px] text-muted-foreground">
              {chosen.length} of {meal.items.length} selected
              {calories > 0 ? ` · ${formatKcal(calories)} kcal` : ""}
            </Text>
            {/* Ticking every line by hand is the one tedious case — this is the
                shortcut, not a default that guesses for the client. */}
            <Pressable
              onPress={() =>
                setSelected(allSelected ? [] : meal.items.map((_, index) => index))
              }
              disabled={isLoading}
              hitSlop={8}
              accessibilityRole="button"
              className="active:opacity-60"
            >
              <Text className="text-[12px] font-semibold text-primary">
                {allSelected ? "Clear" : "Select all"}
              </Text>
            </Pressable>
          </View>

          {error ? (
            <View className="flex-row items-center gap-2 rounded-sm bg-destructive/10 px-3 py-2">
              <Icon name="alert-triangle" size={13} color="--destructive" />
              <Text className="flex-1 text-[12px] text-destructive">{error}</Text>
            </View>
          ) : null}

          <View className="flex-row gap-2">
            <Pressable
              onPress={onClose}
              disabled={isLoading}
              accessibilityRole="button"
              className="h-12 flex-1 items-center justify-center rounded-sm bg-secondary active:opacity-80"
            >
              <Text className="text-[14px] font-semibold text-foreground">Not now</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(chosen)}
              disabled={isLoading || chosen.length === 0}
              accessibilityRole="button"
              className={cn(
                "h-12 flex-1 items-center justify-center rounded-sm bg-primary active:opacity-90",
                (isLoading || chosen.length === 0) && "opacity-60"
              )}
            >
              <Text className="text-[14px] font-bold text-primary-foreground">
                {isLoading
                  ? "Adding…"
                  : chosen.length === 0
                    ? "Add"
                    : allSelected
                      ? "Add them"
                      : `Add ${chosen.length}`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

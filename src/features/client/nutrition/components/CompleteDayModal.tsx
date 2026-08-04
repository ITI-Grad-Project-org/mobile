import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, TextInput, View } from "@/tw";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform } from "react-native";
import { formatKcal, type Macros, type PlannedMeal } from "../data";

export function CompleteDayModal({
  consumed,
  targetCalories,
  pending,
  isLoading,
  error,
  onClose,
  onConfirm,
}: {
  consumed: Macros;
  targetCalories?: number;
  pending: PlannedMeal[];
  isLoading?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (clientNotes?: string) => void;
}) {
  const [notes, setNotes] = useState("");

  const blocked = pending.length > 0;

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Pressable className="absolute inset-0 bg-black/50" onPress={onClose} />

          <View className="w-full gap-4 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-pop">
            <View>
              <Text className="text-[19px] font-bold text-foreground">Finish today</Text>
              <Text className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {blocked
                  ? "A few meals still need an outcome before the day can be closed."
                  : "Your coach sees this day once it's finished. You can't edit it afterwards."}
              </Text>
            </View>

            {/* Summary */}
            <View className="flex-row items-center justify-between rounded-sm bg-secondary px-3 py-2.5">
              <Text className="text-[12px] text-muted-foreground">Consumed</Text>
              <Text
                className="text-[14px] font-bold text-foreground"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {formatKcal(consumed.calories)}
                {typeof targetCalories === "number"
                  ? ` / ${formatKcal(targetCalories)}`
                  : ""}{" "}
                kcal
              </Text>
            </View>

            {blocked ? (
              <View className="gap-1.5 rounded-sm bg-destructive/10 px-3 py-2.5">
                {pending.map((meal) => (
                  <View key={meal.id} className="flex-row items-center gap-2">
                    <Icon name="alert-triangle" size={12} color="--destructive" />
                    <Text className="flex-1 text-[12px] text-destructive">
                      {meal.name} — no outcome yet
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="gap-1">
                <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Notes for your coach (optional)
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="How did the day go?"
                  multiline
                  maxLength={5000}
                  className="min-h-20 rounded-sm border border-border bg-secondary px-3 py-2.5 text-[14px] text-foreground"
                  style={{ textAlignVertical: "top" }}
                />
              </View>
            )}

            {error ? (
              <View className="flex-row items-center gap-2 rounded-sm bg-destructive/10 px-3 py-2">
                <Icon name="alert-triangle" size={13} color="--destructive" />
                <Text className="flex-1 text-[12px] text-destructive">{error}</Text>
              </View>
            ) : null}

            <View className="flex-row gap-2">
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                className="h-12 flex-1 items-center justify-center rounded-sm bg-secondary active:opacity-80"
              >
                <Text className="text-[14px] font-semibold text-foreground">
                  {blocked ? "Back to log" : "Not yet"}
                </Text>
              </Pressable>
              {!blocked ? (
                <Pressable
                  onPress={() => onConfirm(notes.trim() || undefined)}
                  disabled={isLoading}
                  accessibilityRole="button"
                  className={cn(
                    "h-12 flex-1 items-center justify-center rounded-sm bg-primary active:opacity-90",
                    isLoading && "opacity-60"
                  )}
                >
                  <Text className="text-[14px] font-bold text-primary-foreground">
                    {isLoading ? "Finishing…" : "Finish day"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

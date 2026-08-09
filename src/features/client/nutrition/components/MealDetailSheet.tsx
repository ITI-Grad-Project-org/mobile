import type { MealOutcome } from "@/api/types";
import { cn } from "@/lib/utils";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { Tone } from "@/tw/Tone";
import { LinearGradient } from "expo-linear-gradient";
import { Modal, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatGrams, formatKcal, SLOT_LABEL, type PlannedMeal } from "../data";
import { MealOutcomePicker } from "./MealOutcomePicker";

const isIOS = Platform.OS === "ios";

/** Everything the card leaves out: the full prescription, in one place. */
export function MealDetailSheet({
  meal,
  outcome,
  disabled,
  isSaving,
  onSetOutcome,
  onClose,
}: {
  meal: PlannedMeal;
  outcome: MealOutcome | null;
  disabled?: boolean;
  isSaving?: boolean;
  onSetOutcome: (outcome: MealOutcome) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { macros } = meal;

  const eyebrow = [SLOT_LABEL[meal.slot], meal.suggestedTime].filter(Boolean).join(" · ");

  const stats = [
    { l: "Calories", v: formatKcal(macros.calories) },
    { l: "Protein", v: formatGrams(macros.proteinG) },
    { l: "Carbs", v: formatGrams(macros.carbsG) },
    { l: "Fat", v: formatGrams(macros.fatG) },
  ];

  const content = (
    <View className="flex-1 overflow-hidden bg-card">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {meal.photoUrl ? (
          /* Hero photo, with the title laid over a bottom-up fade. */
          <View className="relative aspect-16/11 w-full overflow-hidden bg-secondary">
            <Image
              source={meal.photoUrl}
              className="h-full w-full"
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
            />

            <LinearGradient
              colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0.1)", "rgba(0,0,0,0.55)"]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <GlassButton
              onPress={onClose}
              className={cn(
                "absolute right-4 z-10 h-9 w-9 items-center justify-center rounded-full bg-black/50 active:bg-black/75",
                isIOS ? "top-4" : "top-10"
              )}
              accessibilityLabel="Close"
            >
              <Icon name="x" size={16} color="#ffffff" />
            </GlassButton>

            <View className="pointer-events-none absolute bottom-4 left-5 right-5">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
                {eyebrow}
              </Text>
              <Text className="mt-0.5 text-[24px] font-bold leading-tight text-white shadow-sm">
                {meal.name}
              </Text>
            </View>
          </View>
        ) : (
          /* No photo — the brand gradient carries the header instead. */
          <Tone name="mint" className={cn("px-5 pb-5", isIOS ? "pt-5" : "pt-12")} glass>
            <GlassButton
              onPress={onClose}
              className={cn(
                "absolute right-4 h-9 w-9 items-center justify-center rounded-full bg-black/30 active:bg-black/50",
                isIOS ? "top-4" : "top-11"
              )}
              accessibilityLabel="Close"
            >
              <Icon name="x" size={16} color="#ffffff" />
            </GlassButton>
            <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mint-ink opacity-80">
              {eyebrow}
            </Text>
            <Text className="mt-1 text-[26px] font-bold leading-tight text-mint-ink">
              {meal.name}
            </Text>
          </Tone>
        )}

        <View className="gap-y-6 px-5 pt-5">
          {/* Prescribed macros */}
          {macros.calories > 0 ? (
            <View className="flex-row gap-2">
              {stats.map((stat) => (
                <View
                  key={stat.l}
                  className="flex-1 items-center justify-center rounded-2xl bg-secondary p-3"
                >
                  <Text className="text-[11px] font-medium text-muted-foreground">{stat.l}</Text>
                  <Text
                    className="mt-0.5 text-[17px] font-bold tracking-tight text-foreground"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {stat.v}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Ingredients */}
          <View>
            <Text className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              What&apos;s in it
            </Text>
            {meal.items.length > 0 ? (
              /* One quiet line per ingredient, amount set to the right. */
              <View className="rounded-2xl bg-secondary/60 px-4 py-1">
                {meal.items.map((item, index) => (
                  <View
                    key={`${meal.id}-item-${index}`}
                    className={cn(
                      "flex-row items-center gap-3 py-2.5",
                      index > 0 && "border-t border-border/40"
                    )}
                  >
                    <Text className="flex-1 text-[13.5px] text-foreground">{item.name}</Text>
                    {item.amount ? (
                      <Text
                        className="text-[13px] text-muted-foreground"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {item.amount}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-[13px] leading-relaxed text-muted-foreground">
                Your coach hasn&apos;t listed the ingredients for this meal.
              </Text>
            )}
          </View>

          {/* Coach note — Tone gradient, matching the workout sheets. */}
          {meal.coachNotes ? (
            <Tone name="sky" className="rounded-2xl p-3.5" glass>
              <Text className="text-[12.5px] leading-relaxed text-sky-ink">
                <Text className="font-semibold">Coach note: </Text>
                {meal.coachNotes}
              </Text>
            </Tone>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky footer — the outcome control repeats here so the sheet is a
          complete surface, padded past the home indicator. */}
      <View
        className="gap-2 border-t border-border/60 bg-card/95 px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Did you eat it?
        </Text>
        {!disabled ? (
          <Text className="text-[12px] leading-relaxed text-muted-foreground">
            This tells your coach how closely you followed the plan. Calories only
            move when you add what you ate to the food diary.
          </Text>
        ) : null}
        <MealOutcomePicker
          outcome={outcome}
          mealName={meal.name}
          disabled={disabled}
          isSaving={isSaving}
          onSetOutcome={onSetOutcome}
        />
      </View>
    </View>
  );

  // iOS: native page sheet. Android: transparent modal over a tap-to-dismiss scrim.
  if (isIOS) {
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        {content}
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View className="min-h-[90%] overflow-hidden shadow-pop">{content}</View>
      </View>
    </Modal>
  );
}

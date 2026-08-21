import { Modal } from "react-native";

import { Pressable, SafeAreaView, Text, View } from "@/tw";

import { formatPrice, formatPriceRange } from "@/lib/money";

/**
 * What the price block opens: the coach's full range rather than just the
 * "from" figure the bar has room for.
 *
 * v1 has no packages resource — the coach profile carries `priceFrom` and
 * `priceTo` and nothing more — so this states the range honestly instead of
 * inventing tiers the coach never defined.
 */
export function PackagesSheet({
  visible,
  coachName,
  priceFrom,
  priceTo,
  currency,
  onClose,
}: {
  visible: boolean;
  coachName: string;
  priceFrom?: number;
  priceTo?: number;
  currency?: string;
  onClose: () => void;
}) {
  const range = formatPriceRange(priceFrom, priceTo, currency);
  const hasRange = priceFrom != null && priceTo != null && priceFrom !== priceTo;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/40">
        <Pressable className="rounded-t-3xl bg-background pt-2">
          <SafeAreaView edges={["bottom"]}>
            <View className="items-center pt-1">
              <View className="h-1.5 w-10 rounded-full bg-border" />
            </View>

            <View className="gap-1.5 px-5 pb-1 pt-5">
              <Text className="font-display text-[19px] font-bold text-foreground">
                Coaching with {coachName}
              </Text>
              <Text className="text-[13px] leading-[1.5] text-muted-foreground">
                {hasRange
                  ? "Monthly pricing depends on the plan you agree on together."
                  : "The monthly rate for coaching."}
              </Text>
            </View>

            <View className="px-5 pt-4">
              <View className="gap-1 rounded-[18px] border border-border px-4 py-3.5">
                <Text className="text-[9.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
                  {hasRange ? "Range" : "Monthly"}
                </Text>
                <Text className="text-[20px] font-bold tracking-[-0.01em] text-foreground">
                  {range}
                  <Text className="text-xs font-medium text-muted-foreground"> / mo</Text>
                </Text>
                {hasRange ? (
                  <Text className="pt-1 text-[12px] text-muted-foreground">
                    Starting at {formatPrice(priceFrom, currency)} per month.
                  </Text>
                ) : null}
              </View>
            </View>

            <View className="px-5 pb-4 pt-4">
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                className="h-12 items-center justify-center rounded-full border border-border active:opacity-80"
              >
                <Text className="text-[14.5px] font-semibold text-foreground">Close</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

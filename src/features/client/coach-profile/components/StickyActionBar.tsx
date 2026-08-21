import { ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { Pressable, SafeAreaView, Text, View, useCSSVariable } from "@/tw";

import { formatPrice } from "../lib/money";

export interface StickyActionBarProps {
  /**
   * Omitted entirely for a client who already trains here — they have already
   * paid, and a price tag under their own coach's name is noise.
   */
  price?: { from: number; currency?: string } | null;
  onPricePress?: () => void;
  ctaLabel: string;
  ctaIcon?: IconName;
  onCtaPress: () => void;
  ctaDisabled?: boolean;
  ctaBusy?: boolean;
}

/**
 * The screen's whole point, pinned so it never scrolls away.
 *
 * This holds the ONLY filled orange on the screen. Status is green, "Add
 * review" is outlined, the price is plain text — so the one saturated thing in
 * view is always the thing to do next.
 */
export function StickyActionBar({
  price,
  onPricePress,
  ctaLabel,
  ctaIcon = "message-square",
  onCtaPress,
  ctaDisabled,
  ctaBusy,
}: StickyActionBarProps) {
  const insets = useSafeAreaInsets();
  // ActivityIndicator is a raw RN component — it takes a colour, not a var name.
  const spinnerColor = useCSSVariable("--primary-foreground") as string;
  // `pb-[max(safe-area-bottom, 26px)]` can't be one class here — the inset is a
  // runtime number. Two static classes cover both cases: a device with a home
  // indicator or gesture bar already clears the 26px floor, so SafeAreaView's
  // own inset is enough; a flat-bottomed one gets the floor instead.
  const clearsFloor = insets.bottom >= 26;

  return (
    <View className="absolute inset-x-0 bottom-0 border-t border-border bg-background/96">
      {/* SafeAreaView carries the bottom inset and NOTHING else. Its native view
          recomputes its own padding box from `edges`, which drops horizontal
          padding written as a class — put px-5 on it and the CTA runs to both
          screen edges. The layout lives on the plain View inside. */}
      <SafeAreaView edges={clearsFloor ? ["bottom"] : []}>
        <View
          className={cn(
            "flex-row items-center gap-3 px-5 pt-3",
            clearsFloor ? "pb-0" : "pb-[26px]"
          )}
        >
          {price ? (
            <Pressable
              onPress={onPricePress}
              accessibilityRole="button"
              accessibilityLabel="See packages"
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              className="shrink-0 gap-0.75 active:opacity-70"
            >
              <Text className="text-[9.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
                From
              </Text>
              {/* Currency comes from the coach's own tenant. Nothing here
                  hardcodes a symbol or converts between currencies. */}
              <Text className="text-[17px] font-bold tracking-[-0.01em] text-foreground">
                {formatPrice(price.from, price.currency)}
                <Text className="text-xs font-medium text-muted-foreground"> / mo</Text>
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={onCtaPress}
            disabled={ctaDisabled || ctaBusy}
            accessibilityRole="button"
            className={cn(
              "h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-primary",
              "shadow-cta active:opacity-90",
              (ctaDisabled || ctaBusy) && "opacity-60"
            )}
          >
            {ctaBusy ? (
              <ActivityIndicator size="small" color={spinnerColor} />
            ) : (
              <Icon name={ctaIcon} size={16} color="--primary-foreground" />
            )}
            <Text
              className="text-[14.5px] font-semibold text-primary-foreground"
              numberOfLines={1}
            >
              {ctaLabel}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Surface } from "@/shared/ui/Surface";
import { Pressable, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { router } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, RefreshControl } from "react-native";

import { BillingPlanCard } from "../components/BillingPlanCard";
import { CurrentPlanCard } from "../components/CurrentPlanCard";
import { useBillingData } from "../hooks/useBillingData";
import { useCheckout } from "../hooks/useCheckout";

/**
 * The coach's own CoachHub subscription: what they have, what it allows, and
 * how to buy or renew.
 *
 * This is NOT coach-to-client payments — CoachHub doesn't handle those in V1.
 */
export function BillingScreen() {
  const { plans, summary, isLoading, isFetching, isError, refetchAll } =
    useBillingData();
  const checkout = useCheckout();

  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";

  const onRefresh = useCallback(() => refetchAll(), [refetchAll]);

  const refreshControl = (
    <RefreshControl
      refreshing={isFetching && !isLoading}
      onRefresh={onRefresh}
      tintColor={primaryColor}
    />
  );

  // Scrolls with the content, like every other pushed coach screen. No
  // SafeAreaView: (coach)/_layout already renders AppHeader above this Stack and
  // has consumed the top inset — claiming it again is a gap under the header.
  const header = (
    <View className="flex-row items-center gap-2">
      <GlassButton
        onPress={() => router.back()}
        className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
        accessibilityLabel="Go back"
      >
        <Icon name="chevron-left" size={20} color="--foreground" />
      </GlassButton>
      <Text className="font-display text-[24px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
        Subscription
      </Text>
    </View>
  );

  // Error keeps the same ScrollView so pull-to-refresh still works — a plain
  // View here would strand the coach with no way to retry but leaving.
  if (isError) {
    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-y-4 px-5 pt-4 pb-screen"
        refreshControl={refreshControl}
      >
        {header}
        <Surface radius="lg" className="items-center gap-y-3 p-6">
          <Icon name="alert-triangle" size={22} color="--destructive" />
          <Text className="text-[15px] font-semibold text-foreground text-center">
            Couldn&apos;t load your subscription
          </Text>
          <Text className="text-[13px] text-muted-foreground text-center">
            Pull down to try again.
          </Text>
          <Pressable
            onPress={onRefresh}
            className="mt-1 rounded-full bg-primary px-5 py-2.5 active:opacity-85"
          >
            <Text className="text-[13.5px] font-semibold text-primary-foreground">
              Try again
            </Text>
          </Pressable>
        </Surface>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-4 px-5 pt-4 pb-screen"
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {header}
      {isLoading ? (
        <View className="items-center py-16">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : (
        <>
          {summary ? <CurrentPlanCard summary={summary} plans={plans} /> : null}

          {checkout.error ? (
            <View className="flex-row items-start gap-x-2 rounded-xl bg-destructive/10 p-3 border border-destructive/20">
              <Icon name="alert-triangle" size={16} color="--destructive" />
              <Text className="flex-1 text-[13px] font-medium text-destructive">
                {checkout.error}
              </Text>
              <Pressable
                onPress={checkout.clearError}
                accessibilityLabel="Dismiss error"
              >
                <Icon name="x" size={14} color="--destructive" />
              </Pressable>
            </View>
          ) : null}

          <View className="gap-y-1">
            <Text className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
              Plans
            </Text>
            <Text className="text-[12.5px] text-muted-foreground">
              {/* V1 has no saved-card renewal, no cancellation and no
                    proration. Copy must never imply a recurring charge. */}
              Each payment adds 30 days. There&apos;s no automatic renewal.
            </Text>
          </View>

          <View className="gap-y-3">
            {plans.map((plan) => (
              <BillingPlanCard
                key={plan.plan}
                plan={plan}
                effectivePlan={summary?.plan ?? "free"}
                busy={checkout.pendingPlan === plan.plan}
                disabled={checkout.busy}
                onSelect={checkout.start}
              />
            ))}
          </View>

          <Text className="text-[11.5px] text-muted-foreground text-center px-4">
            Payments are handled by Paymob. Your card details never reach UPLY.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

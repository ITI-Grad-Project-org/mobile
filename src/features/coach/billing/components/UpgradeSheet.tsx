import { cn } from "@/lib/utils";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { ActivityIndicator, Modal } from "react-native";

import { useBillingData } from "../hooks/useBillingData";
import { useCheckout } from "../hooks/useCheckout";
import { clientLimitLabel, formatPlanPrice, usageLabel } from "../lib/format";
import { ctaForPlan } from "../lib/transitions";

interface UpgradeSheetProps {
  visible: boolean;
  /** Why the coach is seeing this — only the headline copy differs. */
  reason: "client-limit" | "expired";
  /** The server's own explanation, when a 403 supplied one. Preferred over our
   *  copy: it names the exact plan and number. */
  serverMessage?: string | null;
  onClose: () => void;
}

/**
 * The upsell, reachable from wherever an entitlement blocked an action. Written
 * once so the client-limit path and the expired-plan path can't drift.
 *
 * Starting a checkout here leaves the app for Paymob, which unmounts nothing —
 * the sheet closes itself first so the coach doesn't come back to a stale modal
 * over the result screen.
 */
export function UpgradeSheet({
  visible,
  reason,
  serverMessage,
  onClose,
}: UpgradeSheetProps) {
  const { plans, summary, isLoading } = useBillingData();
  const checkout = useCheckout();

  const effective = summary?.plan ?? "free";
  const paidPlans = plans.filter((p) => p.plan !== "free");

  const headline =
    reason === "expired" ? "Your plan has expired" : "You've reached your client limit";

  const explanation =
    serverMessage ??
    (reason === "expired"
      ? "Renew to unlock your client limit and the AI plan builder again. Your existing clients are untouched."
      : "Only active clients count towards your limit. Upgrade to make room for more.");

  const handleSelect = async (plan: "solo" | "studio") => {
    onClose();
    await checkout.start(plan);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View className="w-full overflow-hidden bg-card rounded-t-3xl shadow-pop px-5 pt-3 pb-10">
          <View className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1 pr-3">
              <Text className="text-[20px] font-bold text-foreground">{headline}</Text>
              {summary ? (
                <Text className="text-[12.5px] text-muted-foreground mt-0.5">
                  {usageLabel(summary.activeClientCount, summary.activeClientLimit)}
                </Text>
              ) : null}
            </View>
            <GlassButton
              onPress={onClose}
              className="h-9 w-9 justify-center items-center rounded-full bg-secondary active:opacity-75"
              accessibilityLabel="Close"
            >
              <Icon name="x" size={16} color="--muted-foreground" />
            </GlassButton>
          </View>

          <View className="mb-4 flex-row items-start gap-x-2 rounded-xl bg-sun/15 p-3 border border-sun/30">
            <Icon name="alert-triangle" size={16} color="--sun-ink" />
            <Text className="flex-1 text-[13px] font-medium text-sun-ink">{explanation}</Text>
          </View>

          {checkout.error ? (
            <View className="mb-4 flex-row items-start gap-x-2 rounded-xl bg-destructive/10 p-3 border border-destructive/20">
              <Icon name="alert-triangle" size={16} color="--destructive" />
              <Text className="flex-1 text-[13px] font-medium text-destructive">
                {checkout.error}
              </Text>
            </View>
          ) : null}

          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator />
            </View>
          ) : (
            <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
              <View className="gap-y-2.5">
                {paidPlans.map((plan) => {
                  const cta = ctaForPlan(effective, plan.plan);
                  if (cta.hidden) return null;
                  const busy = checkout.pendingPlan === plan.plan;

                  return (
                    <Pressable
                      key={plan.plan}
                      onPress={() => handleSelect(plan.plan as "solo" | "studio")}
                      disabled={checkout.busy}
                      className={cn(
                        "flex-row items-center justify-between gap-x-3 rounded-2xl border border-border bg-secondary/40 p-4 active:opacity-85",
                        checkout.busy && "opacity-50"
                      )}
                    >
                      <View className="flex-1 min-w-0">
                        <Text className="text-[15.5px] font-bold text-foreground">
                          {plan.displayName}
                        </Text>
                        <Text className="text-[12px] text-muted-foreground mt-0.5">
                          {clientLimitLabel(plan.activeClientLimit)}
                        </Text>
                      </View>
                      {busy ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <View className="items-end">
                          <Text className="text-[15px] font-bold text-foreground">
                            {formatPlanPrice(plan)}
                          </Text>
                          <Text className="text-[11px] text-muted-foreground">
                            {plan.durationDays ? `/ ${plan.durationDays} days` : ""}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <Text className="text-[11.5px] text-muted-foreground text-center mt-4 px-2">
                Each payment adds 30 days. There&apos;s no automatic renewal.
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

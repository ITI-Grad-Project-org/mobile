import type { BillingPlan, SubscriptionPlan } from "@/api/types";
import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { ActivityIndicator } from "react-native";

import { clientLimitLabel, formatPlanPrice } from "../lib/format";
import { ctaForPlan } from "../lib/transitions";

interface BillingPlanCardProps {
  plan: BillingPlan;
  /** The tenant's EFFECTIVE plan — decides the button's wording. */
  effectivePlan: SubscriptionPlan;
  busy?: boolean;
  /** Any checkout in flight disables every row's button. */
  disabled?: boolean;
  onSelect: (plan: Exclude<SubscriptionPlan, "free">) => void;
}

/**
 * One catalogue row. Named BillingPlanCard because `PlanCard` already means a
 * training/nutrition plan over in coach/plans.
 *
 * Everything here renders from the API response: price from `priceCents`,
 * limits from `activeClientLimit`, AI from `aiPlanBuilderEnabled`. Nothing
 * about the tiers is hardcoded, so a backend price change lands without an app
 * release.
 */
export function BillingPlanCard({
  plan,
  effectivePlan,
  busy,
  disabled,
  onSelect,
}: BillingPlanCardProps) {
  const cta = ctaForPlan(effectivePlan, plan.plan);
  const isCurrent = plan.plan === effectivePlan;

  return (
    <Card className={cn("gap-y-3 p-4", isCurrent && "border border-primary/40")} glass>
      <View className="flex-row items-start justify-between gap-x-3">
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-x-2">
            <Text className="text-[17px] font-bold text-foreground">{plan.displayName}</Text>
            {isCurrent ? (
              <View className="rounded-full bg-primary/15 px-2 py-0.5">
                <Text className="text-[9.5px] font-bold uppercase tracking-wider text-primary">
                  Current
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-[12.5px] text-muted-foreground mt-0.5">
            {plan.durationDays ? `${plan.durationDays} days of access` : "No expiry"}
          </Text>
        </View>

        <Text className="text-[19px] font-bold tracking-tight text-foreground">
          {formatPlanPrice(plan)}
        </Text>
      </View>

      <View className="gap-y-1.5">
        <FeatureLine
          label={clientLimitLabel(plan.activeClientLimit)}
          included
        />
        <FeatureLine
          label={
            plan.aiPlanBuilderEnabled ? "AI plan builder" : "No AI plan builder"
          }
          included={plan.aiPlanBuilderEnabled}
        />
      </View>

      {!cta.hidden ? (
        <Pressable
          onPress={() => onSelect(plan.plan as Exclude<SubscriptionPlan, "free">)}
          disabled={disabled || busy}
          className={cn(
            "mt-1 flex-row justify-center items-center gap-x-2 rounded-2xl py-3 active:opacity-90",
            isCurrent ? "bg-secondary" : "bg-primary",
            (disabled || busy) && "opacity-50"
          )}
        >
          {busy ? (
            <ActivityIndicator size="small" color={isCurrent ? undefined : "#ffffff"} />
          ) : (
            <Text
              className={cn(
                "text-[14px] font-semibold",
                isCurrent ? "text-foreground" : "text-primary-foreground"
              )}
            >
              {cta.label}
            </Text>
          )}
        </Pressable>
      ) : null}
    </Card>
  );
}

function FeatureLine({ label, included }: { label: string; included: boolean }) {
  return (
    <View className="flex-row items-center gap-x-2">
      <Icon
        name={included ? "check" : "x"}
        size={14}
        color={included ? "--mint-800" : "--muted-foreground"}
      />
      <Text
        className={cn(
          "flex-1 text-[13px]",
          included ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </Text>
    </View>
  );
}

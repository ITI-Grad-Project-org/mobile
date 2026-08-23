import type { BillingPlan, BillingSummary } from "@/api/types";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Text, View } from "@/tw";

import { formatExpiry, usageLabel } from "../lib/format";
import { findPlan } from "../lib/transitions";

interface CurrentPlanCardProps {
  summary: BillingSummary;
  plans: BillingPlan[];
}

/**
 * What the coach has right now. Reads `plan` (effective), never `storedPlan` —
 * the backend derives the effective plan on every read rather than running a
 * job to flip an expired tenant to Free, so `storedPlan` can still say "studio"
 * for a tenant with Free access.
 */
export function CurrentPlanCard({ summary, plans }: CurrentPlanCardProps) {
  const current = findPlan(plans, summary.plan);
  const stored = findPlan(plans, summary.storedPlan);
  const expiry = formatExpiry(summary.subscriptionExpiresAt);
  const hasExpired = summary.plan === "free" && summary.storedPlan !== "free";

  return (
    <Card tone="ink" className="gap-y-4" glass>
      <View className="flex-row items-start justify-between gap-x-3">
        <View className="flex-1 min-w-0">
          <Text className="text-[11.5px] font-bold uppercase tracking-wider text-white/60">
            Your plan
          </Text>
          <Text className="text-[26px] font-bold tracking-tight text-white mt-0.5">
            {current?.displayName ?? summary.plan}
          </Text>
        </View>

        <View
          className={
            summary.isPaidSubscriptionActive
              ? "rounded-full bg-mint px-2.5 py-1"
              : "rounded-full bg-white/15 px-2.5 py-1"
          }
        >
          <Text
            className={
              summary.isPaidSubscriptionActive
                ? "text-[10px] font-bold uppercase tracking-wider text-mint-ink"
                : "text-[10px] font-bold uppercase tracking-wider text-white/80"
            }
          >
            {summary.isPaidSubscriptionActive ? "Active" : "Free"}
          </Text>
        </View>
      </View>

      {/* Why access dropped. Without this an expired Studio coach just sees
          "Free" and reads it as a bug. */}
      {hasExpired && expiry ? (
        <View className="flex-row items-start gap-x-2 rounded-xl bg-white/10 p-3">
          {/* The ink card is dark in BOTH themes, so accents here are fixed
              white — a tone token like --sun inverts and would vanish. */}
          <Icon name="alert-triangle" size={15} color="#ffffff" />
          <Text className="flex-1 text-[12.5px] font-medium text-white/90">
            Your {stored?.displayName ?? summary.storedPlan} plan expired on {expiry}. Your
            clients are safe — renew to unlock your limits again.
          </Text>
        </View>
      ) : summary.isPaidSubscriptionActive && expiry ? (
        <Text className="text-[13px] text-white/70">Active until {expiry}</Text>
      ) : null}

      {/* Not StatCell: its label colour is hardcoded to muted-foreground, which
          disappears on this card. */}
      <View className="flex-row gap-x-3 border-t border-white/15 pt-3.5">
        <InkStat
          value={usageLabel(summary.activeClientCount, summary.activeClientLimit)}
          label="Active clients"
        />
        <InkStat
          value={summary.aiPlanBuilderEnabled ? "Included" : "Not included"}
          label="AI plan builder"
          dim={!summary.aiPlanBuilderEnabled}
        />
      </View>
    </Card>
  );
}

/** StatCell's twin, recoloured for the always-dark ink card. */
function InkStat({
  value,
  label,
  dim,
}: {
  value: string;
  label: string;
  dim?: boolean;
}) {
  return (
    <View className="flex-1 gap-1.5">
      <Text
        className={dim ? "text-[15px] font-semibold text-white/50" : "text-[15px] font-semibold text-white"}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-white/55">
        {label}
      </Text>
    </View>
  );
}

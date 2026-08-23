import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { Surface } from "@/shared/ui/Surface";
import { Pressable, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator } from "react-native";

import { useBillingData } from "../hooks/useBillingData";
import { useCheckoutResult } from "../hooks/useCheckoutResult";
import { formatExpiry } from "../lib/format";
import { findPlan } from "../lib/transitions";

/**
 * Where the coach lands after the Paymob browser closes.
 *
 * Nothing about the browser is evidence. This screen asks CoachHub what
 * actually happened and shows only that. `pending` is the normal first answer:
 * the browser redirect and Paymob's server-to-server webhook are independent,
 * and the browser usually wins.
 */
export function CheckoutResultScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const result = useCheckoutResult(params.id);
  const { summary, plans } = useBillingData();

  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";

  const goToBilling = () => router.replace("/(coach)/billing");

  return (
    <View className="flex-1 bg-background">
      {/* No SafeAreaView and no back button: (coach)/_layout already renders
          AppHeader above this Stack, and leaving mid-confirmation via a back
          chevron would strand a payment the coach still needs the answer to.
          Every terminal state below offers its own way out. */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-y-5 px-5 pt-6 pb-screen"
        showsVerticalScrollIndicator={false}
      >
        {result.state === "loading" || result.state === "pending" ? (
          <ResultBlock
            icon="clock"
            tone="neutral"
            title="Confirming your payment…"
            body="This usually takes a few seconds. Please keep this screen open."
          >
            <ActivityIndicator color={primaryColor} />
          </ResultBlock>
        ) : null}

        {result.state === "succeeded" ? (
          <ResultBlock
            icon="check"
            tone="good"
            title="Payment confirmed"
            body={successBody(summary, plans)}
          >
            <Action label="Back to Subscription" onPress={goToBilling} primary />
          </ResultBlock>
        ) : null}

        {result.state === "failed" ? (
          <ResultBlock
            icon="alert-triangle"
            tone="bad"
            title="Payment was not completed"
            body="Your current plan has not changed and you have not been charged."
          >
            <Action label="Back to Subscription" onPress={goToBilling} primary />
          </ResultBlock>
        ) : null}

        {/* Explicitly NOT a failure. A late webhook still succeeds, and telling
            a coach their payment failed when it is merely slow is the worst
            wrong answer this screen can give. */}
        {result.state === "delayed" ? (
          <ResultBlock
            icon="clock"
            tone="neutral"
            title="Your payment is still being confirmed"
            body="This is taking longer than usual. Your plan will update automatically once it clears."
          >
            <Action label="Check again" onPress={result.checkAgain} primary />
            <Action label="Return to Subscription" onPress={goToBilling} />
          </ResultBlock>
        ) : null}

        {result.state === "request_error" ? (
          <ResultBlock
            icon="alert-triangle"
            tone="bad"
            title="Couldn't check your payment"
            body={
              result.errorMsg ??
              "We couldn't reach the server. Your plan is unchanged until we can confirm."
            }
          >
            <Action label="Check again" onPress={result.checkAgain} primary />
            <Action label="Return to Subscription" onPress={goToBilling} />
          </ResultBlock>
        ) : null}

        {result.state === "missing" ? (
          <ResultBlock
            icon="help-circle"
            tone="neutral"
            title="No payment to confirm"
            body="We don't have a payment in progress. If you just paid, open Subscription to see your current plan."
          >
            <Action label="Open Subscription" onPress={goToBilling} primary />
          </ResultBlock>
        ) : null}

        {/* A payment belongs to the business that started it. Without this the
            coach would see a bare 404 and read it as a lost payment. */}
        {result.state === "tenant_mismatch" ? (
          <ResultBlock
            icon="users"
            tone="neutral"
            title="This payment is for another business"
            body="You started this checkout in a different business. Switch back to it to see the result — the payment is safe."
          >
            <Action label="Return to Subscription" onPress={goToBilling} primary />
          </ResultBlock>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** The succeeded body reads from the REFRESHED /billing/me, not from the
 *  attempt — the attempt says what was bought, the summary says what the coach
 *  now has. */
function successBody(
  summary: ReturnType<typeof useBillingData>["summary"],
  plans: ReturnType<typeof useBillingData>["plans"]
): string {
  if (!summary) return "Your plan has been updated.";

  const name = findPlan(plans, summary.plan)?.displayName ?? summary.plan;
  const expiry = formatExpiry(summary.subscriptionExpiresAt);

  return expiry
    ? `Your ${name} plan is active until ${expiry}.`
    : `Your ${name} plan is active.`;
}

type Tone = "good" | "bad" | "neutral";

function ResultBlock({
  icon,
  tone,
  title,
  body,
  children,
}: {
  icon: IconName;
  tone: Tone;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const ring =
    tone === "good" ? "bg-mint" : tone === "bad" ? "bg-destructive/15" : "bg-secondary";
  const iconColor =
    tone === "good" ? "--mint-ink" : tone === "bad" ? "--destructive" : "--muted-foreground";

  return (
    <Surface radius="lg" className="items-center gap-y-4 p-7">
      <View className={cn("h-16 w-16 items-center justify-center rounded-full", ring)}>
        <Icon name={icon} size={28} color={iconColor} />
      </View>
      <Text className="text-[18px] font-bold text-foreground text-center">{title}</Text>
      <Text className="text-[13.5px] text-muted-foreground text-center leading-5">{body}</Text>
      <View className="w-full gap-y-2 pt-1">{children}</View>
    </Surface>
  );
}

function Action({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "w-full items-center rounded-2xl py-3 active:opacity-85",
        primary ? "bg-primary" : "bg-secondary"
      )}
    >
      <Text
        className={cn(
          "text-[14px] font-semibold",
          primary ? "text-primary-foreground" : "text-foreground"
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

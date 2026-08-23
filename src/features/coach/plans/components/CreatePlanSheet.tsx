import { DASHBOARD_URL } from "@/api/config";
import { useEntitlements } from "@/features/coach/billing";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Modal } from "react-native";

interface CreatePlanSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * The `+` on the Plans screen.
 *
 * Building a plan is a web-dashboard job — the app reads plans but can't author
 * them — so the button explains that and hands the coach over instead of
 * opening an editor that doesn't exist.
 */
export function CreatePlanSheet({ visible, onClose }: CreatePlanSheetProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const entitlements = useEntitlements();

  // No URL configured for this build: the sheet still explains itself, it just
  // has nowhere to send anyone.
  const canOpenDashboard = DASHBOARD_URL.length > 0;

  // Only shown when it's actionable. On Solo/Studio this sheet reads exactly as
  // it did before — its job is explaining where authoring lives, and a second
  // message would dilute that.
  const showAiUpsell = entitlements.isReady && !entitlements.aiPlanBuilderEnabled;

  const handleClose = () => {
    setErrorMsg(null);
    onClose();
  };

  const handleOpenDashboard = async () => {
    setErrorMsg(null);
    try {
      await WebBrowser.openBrowserAsync(DASHBOARD_URL);
      handleClose();
    } catch {
      setErrorMsg("Couldn't open the dashboard. Try again from your browser.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={handleClose} />
        <View className="w-full overflow-hidden bg-card rounded-t-3xl shadow-pop px-5 pt-3 pb-10">
          {/* Handle */}
          <View className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-3">
              <Text className="text-[20px] font-bold text-foreground">Create a plan</Text>
              <Text className="text-[12.5px] text-muted-foreground mt-0.5">
                Plan building lives on the web dashboard
              </Text>
            </View>
            <GlassButton
              onPress={handleClose}
              accessibilityLabel="Close"
              className="h-9 w-9 justify-center items-center rounded-full bg-secondary active:opacity-75"
            >
              <Icon name="x" size={16} color="--muted-foreground" />
            </GlassButton>
          </View>

          <View className="flex-row items-start gap-x-3 rounded-2xl bg-secondary/50 p-4">
            <Icon name="clipboard-list" size={18} color="--muted-foreground" />
            <Text className="flex-1 text-[13px] leading-5 text-muted-foreground">
              Training programs and nutrition plans are built for one client at a
              time on the dashboard. Publish one there and it shows up here, ready
              to review day by day.
            </Text>
          </View>

          {/* The AI plan builder is a paid entitlement enforced server-side on
              POST /ai/plan-suggestions — the dashboard will refuse it, so say so
              before the coach gets there. */}
          {showAiUpsell ? (
            <Pressable
              onPress={() => {
                handleClose();
                router.push("/(coach)/billing");
              }}
              className="mt-3 flex-row items-center gap-x-3 rounded-2xl border border-sun/30 bg-sun/15 p-3.5 active:opacity-85"
            >
              <Icon name="sparkles" size={16} color="--sun-ink" />
              <Text className="flex-1 text-[12.5px] leading-4 font-medium text-sun-ink">
                AI plan building needs a Solo or Studio plan.
              </Text>
              <Icon name="chevron-right" size={14} color="--sun-ink" />
            </Pressable>
          ) : null}

          {errorMsg ? (
            <View className="mt-4 flex-row items-start gap-x-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
              <Icon name="alert-triangle" size={16} color="--destructive" />
              <Text className="flex-1 text-[13px] font-medium text-destructive">{errorMsg}</Text>
            </View>
          ) : null}

          <View className="mt-5 gap-y-2.5">
            {canOpenDashboard ? (
              <Pressable
                onPress={handleOpenDashboard}
                className="flex-row justify-center items-center gap-x-2 rounded-2xl bg-primary py-3.5 shadow-soft active:opacity-90"
              >
                <Icon name="arrow-up" size={15} color="#ffffff" />
                <Text className="text-[14.5px] font-semibold text-primary-foreground">
                  Open dashboard
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={handleClose}
              className="rounded-2xl bg-secondary py-3.5 active:opacity-85"
            >
              <Text className="text-center text-[14.5px] font-semibold text-foreground">
                {canOpenDashboard ? "Not now" : "Got it"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

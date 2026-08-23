import { useUnreadCount } from "@/features/shared/messaging/useUnreadCount";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { useNativeTabsTheme } from "@/shared/hooks/useNativeTabsTheme";
import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function ClientTabsLayout() {
  const theme = useNativeTabsTheme();
  const unread = useUnreadCount();
  const { tenantId } = useActiveTenant();

  // A client's token carries `tenantId: null` until they join a coach, and the
  // AI gateway rejects such a token at handshake — the tenant is what scopes
  // every knowledge-base lookup, so there is nothing to ground against. Showing
  // the tab anyway yields an instant `ai.unauthorized` and a closed socket,
  // which reads as a bug rather than as "not available yet".
  const canUseAssistant = Boolean(tenantId);

  return (
    <NativeTabs {...theme}>
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ai" hidden={!canUseAssistant}>
        <NativeTabs.Trigger.Label>AI</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sparkles" md="star_shine" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="chart.line.uptrend.xyaxis"
          md="show_chart"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="message" md="chat" />
        {unread > 0 && (
          <NativeTabs.Trigger.Badge>
            {unread > 99 ? "99+" : String(unread)}
          </NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

import { useListTenantJoinRequestsQuery } from "@/api/endpoints/joinRequests.endpoints";
import { JoinRequestCard } from "@/features/coach/clients/components/JoinRequestCard";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Card } from "@/shared/ui/Card";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { Pressable, ScrollView, Text, useCSSVariable, View } from "@/tw";
import { router } from "expo-router";
import { ActivityIndicator } from "react-native";

export function NotificationsScreen() {
  const { tenantId } = useActiveTenant();
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";

  const { data, isLoading, isError, refetch } = useListTenantJoinRequestsQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );

  const pendingRequests = (data ?? []).filter((r) => !r.status || r.status === "pending");

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-5 pt-5 pb-30"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-start justify-between px-1">
        <View className="min-w-0 flex-1">
          <Text className="text-[26px] font-bold tracking-tight text-foreground">Notifications</Text>
          <Text className="mt-0.5 text-[13.5px] text-muted-foreground">Requests to join your business.</Text>
        </View>
        <GlassButton
          onPress={() => router.back()}
          className="h-9 w-9 rounded-full bg-secondary items-center justify-center active:opacity-70"
          accessibilityLabel="Close notifications"
        >
          <Icon name="x" size={18} color="--muted-foreground" />
        </GlassButton>
      </View>

      <View className="gap-3">
        <SectionTitle title="Join requests" />
        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color={primaryColor} />
          </View>
        ) : isError ? (
          <Card glass className="items-center gap-3 py-6">
            <Text className="text-[14px] text-muted-foreground">Couldn&apos;t load join requests.</Text>
            <Pressable
              onPress={() => refetch()}
              className="h-11 items-center justify-center rounded-2xl bg-secondary px-6 active:opacity-80"
            >
              <Text className="text-[14px] font-semibold text-foreground">Retry</Text>
            </Pressable>
          </Card>
        ) : pendingRequests.length === 0 ? (
          <Card glass className="items-center gap-3 py-8">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <Icon name="bell" size={24} color="--muted-foreground" />
            </View>
            <View className="items-center gap-1">
              <Text className="text-[16px] font-bold text-foreground">No new requests</Text>
              <Text className="max-w-xs text-center text-[13px] text-muted-foreground">
                When someone asks to join your business, it&apos;ll show up here for you to approve.
              </Text>
            </View>
          </Card>
        ) : (
          pendingRequests.map((request) => (
            <JoinRequestCard key={request.id} request={request} tenantId={tenantId ?? ""} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

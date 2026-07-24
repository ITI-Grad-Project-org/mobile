import { useListInvitationsQuery } from "@/api/endpoints/invitations.endpoints";
import { useListTenantJoinRequestsQuery } from "@/api/endpoints/joinRequests.endpoints";
import { InvitationCard } from "@/features/coach/clients/components/InvitationCard";
import { JoinRequestCard } from "@/features/coach/clients/components/JoinRequestCard";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Card } from "@/shared/ui/Card";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Segmented } from "@/shared/ui/Segmented";
import { Pressable, ScrollView, Text, useCSSVariable, View } from "@/tw";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator } from "react-native";

type Tab = "requests" | "invitations";

function LoadingRow({ color }: { color: string }) {
  return (
    <View className="items-center py-16">
      <ActivityIndicator color={color} />
    </View>
  );
}

function ErrorRow({ onRetry }: { onRetry: () => void }) {
  return (
    <Card glass className="items-center gap-3 py-6">
      <Text className="text-[14px] text-muted-foreground">Couldn&apos;t load this.</Text>
      <Pressable
        onPress={onRetry}
        className="h-11 items-center justify-center rounded-2xl bg-secondary px-6 active:opacity-80"
      >
        <Text className="text-[14px] font-semibold text-foreground">Retry</Text>
      </Pressable>
    </Card>
  );
}

function EmptyRow({ title, description }: { title: string; description: string }) {
  return (
    <Card glass className="items-center gap-3 py-8">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <Icon name="bell" size={24} color="--muted-foreground" />
      </View>
      <View className="items-center gap-1">
        <Text className="text-[16px] font-bold text-foreground">{title}</Text>
        <Text className="max-w-xs text-center text-[13px] text-muted-foreground">{description}</Text>
      </View>
    </Card>
  );
}

export function NotificationsScreen() {
  const { tenantId } = useActiveTenant();
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";
  const [tab, setTab] = useState<Tab>("requests");

  const joinRequests = useListTenantJoinRequestsQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );
  const invitations = useListInvitationsQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );

  const pendingRequests = (joinRequests.data ?? []).filter((r) => !r.status || r.status === "pending");
  // Only surface still-live invites in the feed; past ones live in the Clients screen.
  const pendingInvites = (invitations.data ?? []).filter(
    (i) => String(i.status ?? "pending").toLowerCase() === "pending"
  );

  const options = [
    { value: "requests" as const, label: `Requests${pendingRequests.length ? ` (${pendingRequests.length})` : ""}` },
    { value: "invitations" as const, label: `Invitations${pendingInvites.length ? ` (${pendingInvites.length})` : ""}` },
  ];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-5 pt-5 pb-30"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-start justify-between px-1">
        <View className="min-w-0 flex-1">
          <Text className="text-[26px] font-bold tracking-tight text-foreground">Notifications</Text>
          <Text className="mt-0.5 text-[13.5px] text-muted-foreground">Requests and invitations.</Text>
        </View>
        <GlassButton
          onPress={() => router.back()}
          className="h-9 w-9 rounded-full bg-secondary items-center justify-center active:opacity-70"
          accessibilityLabel="Close notifications"
        >
          <Icon name="x" size={18} color="--muted-foreground" />
        </GlassButton>
      </View>

      <Segmented options={options} value={tab} onChange={setTab} />

      {tab === "requests" ? (
        <View className="gap-3">
          {joinRequests.isLoading ? (
            <LoadingRow color={primaryColor} />
          ) : joinRequests.isError ? (
            <ErrorRow onRetry={() => joinRequests.refetch()} />
          ) : pendingRequests.length === 0 ? (
            <EmptyRow
              title="No new requests"
              description="When someone asks to join your business, it'll show up here to approve."
            />
          ) : (
            pendingRequests.map((request) => (
              <JoinRequestCard key={request.id} request={request} tenantId={tenantId ?? ""} />
            ))
          )}
        </View>
      ) : (
        <View className="gap-3">
          {invitations.isLoading ? (
            <LoadingRow color={primaryColor} />
          ) : invitations.isError ? (
            <ErrorRow onRetry={() => invitations.refetch()} />
          ) : pendingInvites.length === 0 ? (
            <EmptyRow
              title="No pending invitations"
              description="Invites you send to clients that haven't been accepted yet will appear here."
            />
          ) : (
            pendingInvites.map((invite) => (
              <InvitationCard key={invite.id} invitation={invite} tenantId={tenantId ?? ""} />
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

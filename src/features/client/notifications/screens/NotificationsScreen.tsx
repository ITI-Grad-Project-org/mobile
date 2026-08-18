import { CLIENT_INVITATIONS_READY, useListMyInvitationsQuery } from "@/api/endpoints/invitations.endpoints";
import { useListMyJoinRequestsQuery } from "@/api/endpoints/joinRequests.endpoints";
import { Card } from "@/shared/ui/Card";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Segmented } from "@/shared/ui/Segmented";
import { Pressable, ScrollView, Text, useCSSVariable, View } from "@/tw";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator } from "react-native";
import { InvitationNotificationCard, type ClientInvitation } from "../components/InvitationNotificationCard";
import { JoinRequestStatusCard } from "../components/JoinRequestStatusCard";

type Tab = "invitations" | "requests";

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
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";
  const [tab, setTab] = useState<Tab>("invitations");

  const invitations = useListMyInvitationsQuery(undefined, { skip: !CLIENT_INVITATIONS_READY });
  const joinRequests = useListMyJoinRequestsQuery();

  const pendingInvites: ClientInvitation[] = (invitations.data ?? []).filter(
    (i) => !i.status || i.status === "pending"
  );
  const myRequests = joinRequests.data ?? [];

  const options = [
    { value: "invitations" as const, label: `Invitations${pendingInvites.length ? ` (${pendingInvites.length})` : ""}` },
    { value: "requests" as const, label: `Requests${myRequests.length ? ` (${myRequests.length})` : ""}` },
  ];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-5 pt-5 pb-screen"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-start justify-between px-1">
        <View className="min-w-0 flex-1">
          <Text className="text-[26px] font-bold tracking-tight text-foreground">Notifications</Text>
          <Text className="mt-0.5 text-[13.5px] text-muted-foreground">Invitations and requests.</Text>
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

      {tab === "invitations" ? (
        <View className="gap-3">
          {invitations.isLoading ? (
            <LoadingRow color={primaryColor} />
          ) : pendingInvites.length > 0 ? (
            // Only render invites when we actually have data. A failed request
            // (e.g. the backend route isn't live yet) falls through to the empty
            // state rather than a hard error — there's nothing for the user to fix.
            pendingInvites.map((invite) => (
              <InvitationNotificationCard key={invite.id} invitation={invite} />
            ))
          ) : (
            <EmptyRow
              title="No invitations"
              description="When a coach invites you to train together, it'll show up here to accept."
            />
          )}
        </View>
      ) : (
        <View className="gap-3">
          {joinRequests.isLoading ? (
            <LoadingRow color={primaryColor} />
          ) : joinRequests.isError ? (
            <ErrorRow onRetry={() => joinRequests.refetch()} />
          ) : myRequests.length === 0 ? (
            <EmptyRow
              title="No requests yet"
              description="Requests you send to coaches — and their responses — will appear here."
            />
          ) : (
            myRequests.map((request) => (
              <JoinRequestStatusCard key={request.id} request={request} />
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

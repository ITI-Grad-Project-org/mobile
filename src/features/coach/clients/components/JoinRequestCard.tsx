import {
  useApproveJoinRequestMutation,
  useRejectJoinRequestMutation,
} from "@/api/endpoints/joinRequests.endpoints";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { ActivityIndicator } from "react-native";

interface JoinRequestCardProps {
  request: any;
  tenantId: string;
}

export function JoinRequestCard({ request, tenantId }: JoinRequestCardProps) {
  const [approveJoinRequest, { isLoading: isApproving }] = useApproveJoinRequestMutation();
  const [rejectJoinRequest, { isLoading: isRejecting }] = useRejectJoinRequestMutation();

  const isBusy = isApproving || isRejecting;

  const handleApprove = async () => {
    try {
      await approveJoinRequest({ id: request.id, tenantId }).unwrap();
    } catch {
      // Error handles automatically via RTK Query cache invalidation
    }
  };

  const handleReject = async () => {
    try {
      await rejectJoinRequest({ id: request.id, tenantId }).unwrap();
    } catch {
      // Error handles automatically via RTK Query cache invalidation
    }
  };

  const clientName =
    request?.client?.firstName && request?.client?.lastName
      ? `${request.client.firstName} ${request.client.lastName}`
      : request?.client?.email || "Join Request";

  return (
    <Card className="gap-y-2.5 p-3.5" glass>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-x-2.5 flex-1 min-w-0">
          <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint/20">
            <Icon name="user-check" size={18} color="--mint-ink" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="truncate text-[14.5px] font-semibold text-foreground" numberOfLines={1}>
              {clientName}
            </Text>
            <Text className="text-[11.5px] text-muted-foreground mt-0.5" numberOfLines={1}>
              {request?.client?.email || "Requested to join your business"}
            </Text>
          </View>
        </View>

        <View className="rounded-full bg-mint px-2 py-0.5">
          <Text className="text-[10px] font-bold text-mint-ink uppercase tracking-wider">
            Join Request
          </Text>
        </View>
      </View>

      {request?.message ? (
        <View className="rounded-xl bg-secondary/50 p-2.5">
          <Text className="text-[12px] text-foreground italic" numberOfLines={2}>
            {`"${request.message}"`}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center gap-x-2 pt-1">
        <Pressable
          onPress={handleApprove}
          disabled={isBusy}
          className="flex-1 flex-row justify-center items-center rounded-xl bg-primary py-2.5 active:opacity-85"
        >
          {isApproving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text className="text-[13px] font-semibold text-primary-foreground">Approve</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleReject}
          disabled={isBusy}
          className="flex-1 flex-row justify-center items-center rounded-xl bg-secondary py-2.5 active:opacity-85"
        >
          {isRejecting ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text className="text-[13px] font-semibold text-muted-foreground">Reject</Text>
          )}
        </Pressable>
      </View>
    </Card>
  );
}

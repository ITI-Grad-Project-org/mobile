import { useWithdrawJoinRequestMutation } from "@/api/endpoints/joinRequests.endpoints";
import { Card } from "@/shared/ui/Card";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { ActivityIndicator } from "react-native";

type StatusKey = "pending" | "approved" | "rejected";

// API responses are untyped; describe just the fields this card reads.
interface JoinRequest {
  id: string;
  status?: string;
  message?: string;
  tenant?: { businessName?: string; name?: string };
  coachName?: string;
}

const STATUS_META: Record<StatusKey, { label: string; chip: string; ink: string; icon: IconName }> = {
  pending: { label: "Pending", chip: "bg-sun", ink: "text-sun-ink", icon: "clock" },
  approved: { label: "Approved", chip: "bg-mint", ink: "text-mint-ink", icon: "user-check" },
  rejected: { label: "Declined", chip: "bg-peach", ink: "text-peach-ink", icon: "x" },
};

const ICON_TONE: Record<StatusKey, string> = {
  pending: "--sun-ink",
  approved: "--mint-ink",
  rejected: "--peach-ink",
};

const CHIP_BG: Record<StatusKey, string> = {
  pending: "bg-sun/20",
  approved: "bg-mint/20",
  rejected: "bg-peach/20",
};

export function JoinRequestStatusCard({ request }: { request: JoinRequest }) {
  const [withdrawJoinRequest, { isLoading: isWithdrawing }] = useWithdrawJoinRequestMutation();

  const status: StatusKey = (["pending", "approved", "rejected"] as const).includes(
    request.status as StatusKey
  )
    ? (request.status as StatusKey)
    : "pending";
  const meta = STATUS_META[status];

  const title =
    request.tenant?.businessName || request.tenant?.name || request.coachName || "Your request";

  const handleWithdraw = async () => {
    try {
      await withdrawJoinRequest({ id: request.id }).unwrap();
    } catch {
      // Failure surfaces via cache; nothing to do here.
    }
  };

  return (
    <Card className="gap-y-2.5 p-3.5" glass>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-x-2.5 flex-1 min-w-0">
          <View className={`h-9 w-9 shrink-0 items-center justify-center rounded-xl ${CHIP_BG[status]}`}>
            <Icon name={meta.icon} size={18} color={ICON_TONE[status]} />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="truncate text-[14.5px] font-semibold text-foreground" numberOfLines={1}>
              {title}
            </Text>
            <Text className="text-[11.5px] text-muted-foreground mt-0.5" numberOfLines={1}>
              {status === "pending"
                ? "Waiting for the coach to respond"
                : status === "approved"
                  ? "You're in — open the app to get started"
                  : "This coach declined your request"}
            </Text>
          </View>
        </View>

        <View className={`rounded-full px-2 py-0.5 ${meta.chip}`}>
          <Text className={`text-[10px] font-bold uppercase tracking-wider ${meta.ink}`}>{meta.label}</Text>
        </View>
      </View>

      {status === "pending" ? (
        <View className="flex-row items-center pt-1">
          <Pressable
            onPress={handleWithdraw}
            disabled={isWithdrawing}
            className="flex-1 flex-row justify-center items-center rounded-xl bg-secondary py-2.5 active:opacity-85"
          >
            {isWithdrawing ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text className="text-[13px] font-semibold text-muted-foreground">Withdraw</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

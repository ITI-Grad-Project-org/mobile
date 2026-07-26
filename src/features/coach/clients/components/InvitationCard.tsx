import { useRevokeInvitationMutation } from "@/api/endpoints/invitations.endpoints";
import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { ActivityIndicator, Alert } from "react-native";

interface InvitationCardProps {
  invitation: any;
  tenantId: string;
}

/** Badge appearance per invitation status. */
const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "Invited", bg: "bg-sun", text: "text-sun-ink" },
  accepted: { label: "Joined", bg: "bg-mint", text: "text-mint-ink" },
  expired: { label: "Expired", bg: "bg-secondary", text: "text-muted-foreground" },
  cancelled: { label: "Cancelled", bg: "bg-secondary", text: "text-muted-foreground" },
  revoked: { label: "Revoked", bg: "bg-secondary", text: "text-muted-foreground" },
};

/** Human-friendly expiry hint from an ISO timestamp, e.g. "Expires in 5 days". */
function expiryLabel(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime();
  if (Number.isNaN(ms)) return null;
  const days = Math.ceil((ms - Date.now()) / 86_400_000);
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

export function InvitationCard({ invitation, tenantId }: InvitationCardProps) {
  const [revokeInvitation, { isLoading }] = useRevokeInvitationMutation();

  // API returns `clientName` (not `name`); keep `name` as a defensive fallback.
  const displayName = invitation.clientName || invitation.name;
  const label = displayName || invitation.email;
  const status = String(invitation.status ?? "pending").toLowerCase();
  const isPending = status === "pending";
  const badge = STATUS_META[status] ?? STATUS_META.pending;
  const subtitle = displayName ? invitation.email : "Email invitation";
  // Expiry is only meaningful while an invite is still live.
  const expiry = isPending ? expiryLabel(invitation.expiresAt) : null;

  const doRevoke = async () => {
    try {
      await revokeInvitation({ id: invitation.id, tenantId }).unwrap();
    } catch (err: any) {
      const status = err?.status ?? err?.originalStatus;
      const serverMsg = err?.data?.message;
      const flat = Array.isArray(serverMsg) ? serverMsg.join(" ") : serverMsg;
      const msg =
        status === 404
          ? "This invitation no longer exists — it may have already been used or revoked."
          : typeof flat === "string" && flat
            ? flat
            : "Couldn't revoke the invitation. Please try again.";
      Alert.alert("Revoke failed", msg);
    }
  };

  const handleRevoke = () => {
    Alert.alert(
      "Revoke invitation?",
      `${label} will no longer be able to join with this invitation code.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Revoke", style: "destructive", onPress: doRevoke },
      ]
    );
  };

  return (
    <Card className={cn("flex-row items-center justify-between p-3.5", !isPending && "opacity-70")} glass>
      <View className="flex-row items-center gap-x-3 flex-1 min-w-0">
        <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sun/20">
          <Icon name="mail" size={18} color="--sun-ink" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="truncate text-[14.5px] font-semibold text-foreground" numberOfLines={1}>
            {label}
          </Text>
          <Text className="text-[11.5px] text-muted-foreground mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
          {expiry ? (
            <View className="flex-row items-center gap-x-1 mt-1">
              <Icon name="clock" size={11} color="--muted-foreground" />
              <Text className="text-[11px] text-muted-foreground">{expiry}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center gap-x-2 shrink-0">
        <View className={cn("rounded-full px-2 py-0.5", badge.bg)}>
          <Text className={cn("text-[10px] font-bold uppercase tracking-wider", badge.text)}>
            {badge.label}
          </Text>
        </View>

        {isPending ? (
          <Pressable
            onPress={handleRevoke}
            disabled={isLoading}
            hitSlop={8}
            className="h-8 w-8 items-center justify-center rounded-full bg-secondary active:opacity-75"
          >
            {isLoading ? (
              <ActivityIndicator size="small" />
            ) : (
              <Icon name="trash" size={14} color="--destructive" />
            )}
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

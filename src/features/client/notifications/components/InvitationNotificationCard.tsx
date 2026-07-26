import { useDeclineInvitationMutation } from "@/api/endpoints/invitations.endpoints";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { router } from "expo-router";
import { ActivityIndicator } from "react-native";

// API responses are untyped; describe just the fields this card reads.
export interface ClientInvitation {
  id: string;
  status?: string;
  email?: string;
  coachName?: string;
  businessName?: string;
  avatarUrl?: string;
  code?: string;
  tenantId?: string;
  expiresAt?: string;
}

function formatExpiry(iso?: string): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return "Expired";
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return days <= 1 ? "Expires soon" : `Expires in ${days} days`;
}

export function InvitationNotificationCard({ invitation }: { invitation: ClientInvitation }) {
  const [declineInvitation, { isLoading: isDeclining }] = useDeclineInvitationMutation();

  const title = invitation.businessName || invitation.coachName || "Coaching invitation";
  const subtitle = invitation.coachName && invitation.businessName ? invitation.coachName : invitation.email;
  const expiry = formatExpiry(invitation.expiresAt);

  const handleAccept = () => {
    router.push({
      pathname: "/(setup)/intake",
      params: {
        ...(invitation.tenantId ? { tenantId: invitation.tenantId } : {}),
        ...(invitation.coachName ? { coachName: invitation.coachName } : {}),
        ...(invitation.businessName ? { businessName: invitation.businessName } : {}),
        ...(invitation.avatarUrl ? { avatarUrl: invitation.avatarUrl } : {}),
        ...(invitation.code ? { code: invitation.code } : {}),
      },
    });
  };

  const handleDismiss = async () => {
    try {
      await declineInvitation({ id: invitation.id }).unwrap();
    } catch {
      // Failure surfaces via cache; nothing to do here.
    }
  };

  return (
    <Card className="gap-y-2.5 p-3.5" glass>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-x-2.5 flex-1 min-w-0">
          <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lilac/20">
            <Icon name="user-plus" size={18} color="--lilac-ink" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="truncate text-[14.5px] font-semibold text-foreground" numberOfLines={1}>
              {title}
            </Text>
            <Text className="text-[11.5px] text-muted-foreground mt-0.5" numberOfLines={1}>
              {subtitle || "Invited you to train together"}
            </Text>
          </View>
        </View>

        <View className="rounded-full bg-lilac px-2 py-0.5">
          <Text className="text-[10px] font-bold text-lilac-ink uppercase tracking-wider">Invite</Text>
        </View>
      </View>

      {expiry ? (
        <View className="flex-row items-center gap-1.5">
          <Icon name="clock" size={12} color="--muted-foreground" />
          <Text className="text-[11.5px] text-muted-foreground">{expiry}</Text>
        </View>
      ) : null}

      <View className="flex-row items-center gap-x-2 pt-1">
        <Pressable
          onPress={handleAccept}
          disabled={isDeclining}
          className="flex-1 flex-row justify-center items-center rounded-xl bg-primary py-2.5 active:opacity-85"
        >
          <Text className="text-[13px] font-semibold text-primary-foreground">Accept</Text>
        </Pressable>

        <Pressable
          onPress={handleDismiss}
          disabled={isDeclining}
          className="flex-1 flex-row justify-center items-center rounded-xl bg-secondary py-2.5 active:opacity-85"
        >
          {isDeclining ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text className="text-[13px] font-semibold text-muted-foreground">Dismiss</Text>
          )}
        </Pressable>
      </View>
    </Card>
  );
}

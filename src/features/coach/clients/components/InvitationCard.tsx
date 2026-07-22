import { useRevokeInvitationMutation } from "@/api/endpoints/invitations.endpoints";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { ActivityIndicator } from "react-native";

interface InvitationCardProps {
  invitation: any;
  tenantId: string;
}

export function InvitationCard({ invitation, tenantId }: InvitationCardProps) {
  const [revokeInvitation, { isLoading }] = useRevokeInvitationMutation();

  const handleRevoke = async () => {
    try {
      await revokeInvitation({ id: invitation.id, tenantId }).unwrap();
    } catch {
      // Error handled via RTK Query cache invalidation
    }
  };

  return (
    <Card className="flex-row items-center justify-between p-3.5" glass>
      <View className="flex-row items-center gap-x-3 flex-1 min-w-0">
        <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sun/20">
          <Icon name="mail" size={18} color="--sun-ink" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="truncate text-[14.5px] font-semibold text-foreground" numberOfLines={1}>
            {invitation.name || invitation.email}
          </Text>
          <Text className="text-[11.5px] text-muted-foreground mt-0.5" numberOfLines={1}>
            {invitation.name ? invitation.email : "Pending email invitation"}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-x-2 shrink-0">
        <View className="rounded-full bg-sun px-2 py-0.5">
          <Text className="text-[10px] font-bold text-sun-ink uppercase tracking-wider">
            Invited
          </Text>
        </View>

        <Pressable
          onPress={handleRevoke}
          disabled={isLoading}
          className="h-8 w-8 items-center justify-center rounded-full bg-secondary active:opacity-75"
        >
          {isLoading ? (
            <ActivityIndicator size="small" />
          ) : (
            <Icon name="trash" size={14} color="--destructive" />
          )}
        </Pressable>
      </View>
    </Card>
  );
}

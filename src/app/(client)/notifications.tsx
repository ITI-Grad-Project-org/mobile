import { NotificationsScreen } from "@/features/client/notifications";
import { View } from "@/tw";

export default function ClientNotificationsRoute() {
  return (
    <View className="flex-1 bg-background px-4">
      <NotificationsScreen />
    </View>
  );
}

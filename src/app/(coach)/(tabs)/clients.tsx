import { ClientsScreen } from "@/features/coach/clients";
import { View } from "@/tw";

export default function CoachClientsRoute() {
  return (
    <View className="flex-1 bg-background px-4">
      <ClientsScreen />
    </View>
  );
}

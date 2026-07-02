import { ClientHeader } from "@/shared/components/ClientHeader";
import { View } from "@/tw";
import { Stack } from "expo-router";

export default function ClientLayout() {
  return (
    <View className="flex-1 bg-background" >
      <ClientHeader />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

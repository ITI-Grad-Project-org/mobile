import { AppHeader } from "@/shared/components/AppHeader";
import { View } from "@/tw";
import { Stack } from "expo-router";

export default function ClientLayout() {
  return (
    <View className="flex-1 bg-background">
      <AppHeader />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" options={{ presentation: "modal" }} />
        <Stack.Screen name="measurement" options={{ presentation: "modal" }} />
      </Stack>
    </View>
  );
}

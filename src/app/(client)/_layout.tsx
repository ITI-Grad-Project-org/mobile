import { AppHeader } from "@/shared/components/AppHeader";
import { View } from "@/tw";
import { Stack } from "expo-router";

export default function ClientLayout() {
  return (
    <View className="flex-1 bg-background">
      <AppHeader />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="measurement" options={{ presentation: "modal" }} />
        <Stack.Screen name="notifications" options={{ presentation: "modal" }} />
        <Stack.Screen name="workout/[programDayId]" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="program/[programId]" />
      </Stack>
    </View>
  );
}

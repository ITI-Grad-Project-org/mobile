import { AppHeader } from "@/shared/components/AppHeader";
import { View } from "@/tw";
import { Stack } from "expo-router";

export default function CoachLayout() {
  return (
    <View className="flex-1 bg-background">
      <AppHeader />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="profile" options={{ presentation: "modal" }} />
        <Stack.Screen name="notifications" options={{ presentation: "modal" }} />
      </Stack>
    </View>
  );
}

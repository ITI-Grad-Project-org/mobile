import { Stack } from "expo-router";

export default function SetupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="client-profile" />
      <Stack.Screen name="coach-profile" />
      <Stack.Screen name="match-coach" />
    </Stack>
  );
}

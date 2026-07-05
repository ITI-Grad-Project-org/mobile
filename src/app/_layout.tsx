import "@/global.css";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useState } from "react";
import { StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnimatedSplash } from "@/shared/components/AnimatedSplash";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore — hiding may already be in progress on fast reloads.
});

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  const handleRootLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={"default"} />
        <View style={{ flex: 1 }} onLayout={handleRootLayout}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(coach)" />
            <Stack.Screen name="(client)" />
          </Stack>
          {!splashDone && (
            <AnimatedSplash onFinish={() => setSplashDone(true)} />
          )}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

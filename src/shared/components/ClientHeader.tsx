import { useRole } from "@/lib/role";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, View } from "@/tw";
import { Image } from "@/tw/image";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ClientHeader() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useColorScheme();
  const { clientProfile } = useRole();

  const isDark = colorScheme === "dark";

  const toggleTheme = () => {
    setColorScheme(isDark ? "light" : "dark");
  };

  const handleProfilePress = () => {
    // Navigate to the client profile tab
    router.navigate("/(client)/(tabs)/profile");
  };

  const handleNotificationPress = () => {
    // Notification action placeholder
    console.log("Notification button pressed");
  };

  return (
    <View
      style={{ paddingTop: Math.max(top, 12) }}
      className="bg-background border-b border-border shadow-soft z-50"
    >
      <View className="h-14 px-4 flex-row items-center justify-between">
        {/* Logo and Brand */}
        <View className="flex-row items-center gap-2">
          {/* <View className="h-8 w-8 rounded-lg bg-primary items-center justify-center">
            {isDark ? <Image source={"@/assets/images/icon.png"} /> : <Image />}
          </View>
          <Text className="font-display text-lg font-black tracking-tight text-foreground">
            <Text className="text-primary">UPLY</Text>
          </Text> */}
          <Image
            source={
              !isDark
                ? require("@/assets/images/Uply-dark-logo.png")
                : require("@/assets/images/Uply-light-logo.png")
            }
            className="h-12 w-40 object-cover"
          />
        </View>

        {/* Action Controls */}
        <View className="flex-row items-center gap-4">
          {/* Dark Mode Toggle */}
          <Pressable
            onPress={toggleTheme}
            className="h-9 w-9 rounded-full bg-secondary items-center justify-center active:opacity-70"
            accessibilityLabel="Toggle theme"
          >
            <Icon
              name={isDark ? "sun" : "moon"}
              size={18}
              color={isDark ? "--sun-ink" : "--muted-foreground"}
            />
          </Pressable>

          {/* Notification Button */}
          <Pressable
            onPress={handleNotificationPress}
            className="h-9 w-9 rounded-full bg-secondary items-center justify-center relative active:opacity-70"
            accessibilityLabel="Notifications"
          >
            <Icon name="bell" size={18} color="--muted-foreground" />
            {/* Red badge dot indicator */}
            <View className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border border-card" />
          </Pressable>

          {/* Profile Button */}
          <Pressable
            onPress={handleProfilePress}
            className="h-9 w-9 rounded-full overflow-hidden border border-border active:opacity-70"
            accessibilityLabel="View profile"
          >
            {clientProfile?.avatar ? (
              <Image source={clientProfile.avatar} className="h-full w-full" />
            ) : (
              <View className="h-full w-full bg-muted items-center justify-center">
                <Icon name="person" size={20} color="--muted-foreground" />
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

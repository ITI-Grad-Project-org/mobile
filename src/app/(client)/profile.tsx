import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      {/* Modal header with close control */}
      <View
        style={{ paddingTop: Math.max(top, 12) }}
        className="px-4 pb-3 flex-row items-center justify-between border-b border-border"
      >
        <Text className="text-foreground text-xl font-bold">Profile</Text>
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 rounded-full bg-secondary items-center justify-center active:opacity-70"
          accessibilityLabel="Close profile"
        >
          <Icon name="x" size={18} color="--muted-foreground" />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center">
        <Text className="text-foreground text-3xl font-bold">
          Profile Screen
        </Text>
      </View>
    </View>
  );
}

import { AntDesign } from "@expo/vector-icons";
import { ActivityIndicator } from "react-native";

import { Pressable, Text } from "@/tw";

export function GoogleButton({
  onPress,
  disabled,
  loading,
}: {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className="flex-row items-center justify-center gap-3 rounded-2xl border border-border bg-card py-3.5 shadow-soft active:opacity-70 disabled:opacity-60"
    >
      {loading ? (
        <ActivityIndicator size="small" color="#EA4335" />
      ) : (
        <AntDesign name="google" size={18} color="#EA4335" />
      )}
      <Text className="text-[14px] font-semibold text-foreground">
        Continue with Google
      </Text>
    </Pressable>
  );
}


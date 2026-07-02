import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import Reanimated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { Pressable, Text, View } from "@/tw";
import { cn } from "@/shared/utils/cn";

export type AuthRole = "client" | "coach";

const ROLES: AuthRole[] = ["client", "coach"];

const AnimatedView = Reanimated.createAnimatedComponent(View);

export function RoleToggle({
  role,
  onChange,
}: {
  role: AuthRole;
  onChange: (r: AuthRole) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) =>
    setTrackWidth(e.nativeEvent.layout.width);

  const half = trackWidth > 0 ? (trackWidth - 8) / 2 : 0;
  const index = ROLES.indexOf(role);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(index * half, { duration: 250 }) }],
  }));

  return (
    <View
      onLayout={onLayout}
      className="relative flex-row rounded-full bg-secondary p-1"
    >
      {half > 0 ? (
        <AnimatedView
          style={[{ width: half }, indicatorStyle]}
          className="absolute bottom-1 left-1 top-1 rounded-full bg-card shadow-soft"
        />
      ) : null}
      {ROLES.map((r) => (
        <Pressable
          key={r}
          onPress={() => onChange(r)}
          className="flex-1 items-center rounded-full py-2"
        >
          <Text
            className={cn(
              "text-[13px] font-semibold capitalize",
              role === r ? "text-foreground" : "text-muted-foreground",
            )}
          >
            I&apos;m a {r}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

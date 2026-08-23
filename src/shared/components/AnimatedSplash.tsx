import { useCallback, useEffect, useRef } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useCSSVariable } from "@/tw";

const LOGOS = {
  light: require("@/assets/images/Uply-dark-logo.png"),
  dark: require("@/assets/images/Uply-offwhite-logo.png"),
} as const;

const FALLBACK_BG = { light: "#f8f5f1", dark: "#0b0d13" } as const;

const LOGO_WIDTH = 300;
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * 607) / 1080);

type Props = {
  onFinish: () => void;
  /** Keep the overlay up (no fade-out) until this flips back to false. */
  hold?: boolean;
};

export function AnimatedSplash({ onFinish, hold = false }: Props) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themedBg = useCSSVariable("--background") as string | undefined;
  const backgroundColor = themedBg ?? FALLBACK_BG[scheme];

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const screenOpacity = useSharedValue(1);

  // Kept in a ref so an inline `onFinish` from the parent can't restart the
  // fade-out animation on every re-render.
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);
  const finish = useCallback(() => onFinishRef.current(), []);

  useEffect(() => {
    // Logo fades + springs in.
    logoOpacity.value = withTiming(1, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withSpring(1, { damping: 13, stiffness: 130, mass: 0.8 });
  }, [logoOpacity, logoScale]);

  useEffect(() => {
    // While held (e.g. a tenant switch is in flight) the overlay stays opaque.
    if (hold) return;

    // Hold, then fade the overlay out and notify the parent when done.
    screenOpacity.value = withDelay(
      1000,
      withTiming(
        0,
        { duration: 380, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(finish)();
        }
      )
    );
  }, [hold, screenOpacity, finish]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { backgroundColor },
        screenStyle,
      ]}
    >
      <Animated.Image
        source={LOGOS[scheme]}
        style={[styles.logo, logoStyle]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
});

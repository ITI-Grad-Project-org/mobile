import {
  useCssElement,
  useNativeVariable as useFunctionalVariable,
} from "react-native-css";

import { Link as RouterLink } from "expo-router";
import React from "react";
import {
  FlatList as RNFlatList,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput as RNTextInput,
  TouchableHighlight as RNTouchableHighlight,
  View as RNView,
  StyleSheet,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

// CSS-enabled Link
export const Link = (
  props: React.ComponentProps<typeof RouterLink> & { className?: string }
) => {
  // Cast to a simple component type so TS doesn't expand RouterLink's huge
  // generic href union (TS2590 "union type too complex").
  return useCssElement(RouterLink as React.ComponentType<any>, props, {
    className: "style",
  });
};

Link.Trigger = RouterLink.Trigger;
Link.Menu = RouterLink.Menu;
Link.MenuAction = RouterLink.MenuAction;
Link.Preview = RouterLink.Preview;

// Read a CSS variable from JS (e.g. for non-className props like gradient colors)
export const useCSSVariable =
  process.env.EXPO_OS !== "web"
    ? useFunctionalVariable
    : (variable: string) => `var(${variable})`;

// View
export type ViewProps = React.ComponentProps<typeof RNView> & {
  className?: string;
};

export const View = (props: ViewProps) => {
  return useCssElement(RNView, props, { className: "style" });
};
View.displayName = "CSS(View)";

// Text
export const Text = (
  props: React.ComponentProps<typeof RNText> & { className?: string }
) => {
  return useCssElement(RNText, props, { className: "style" });
};
Text.displayName = "CSS(Text)";

// ScrollView. `ref` is declared explicitly: this is a plain function component,
// so it isn't in ComponentProps, but React 19 passes ref through as an ordinary
// prop and useCssElement spreads it onto the RN ScrollView underneath — which
// is what a screen needs to call scrollTo().
export const ScrollView = (
  props: React.ComponentProps<typeof RNScrollView> & {
    ref?: React.Ref<RNScrollView>;
    className?: string;
    contentContainerClassName?: string;
  }
) => {
  return useCssElement(RNScrollView as React.ComponentType<any>, props, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  });
};
ScrollView.displayName = "CSS(ScrollView)";

// FlatList. Without this wrapper the bare RN list silently ignores
// className/contentContainerClassName — no padding, no row gap.
export const FlatList = <ItemT,>(
  props: React.ComponentProps<typeof RNFlatList<ItemT>> & {
    className?: string;
    contentContainerClassName?: string;
  }
) => {
  return useCssElement(RNFlatList as React.ComponentType<any>, props, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  });
};

// Pressable
export const Pressable = (
  props: React.ComponentProps<typeof RNPressable> & { className?: string }
) => {
  return useCssElement(RNPressable as React.ComponentType<any>, props, {
    className: "style",
  });
};
Pressable.displayName = "CSS(Pressable)";

// SafeAreaView (react-native-safe-area-context). className works here, but you
// still typically want flex-1 so it fills the screen.
export const SafeAreaView = (
  props: React.ComponentProps<typeof RNSafeAreaView> & { className?: string }
) => {
  return useCssElement(RNSafeAreaView as React.ComponentType<any>, props, {
    className: "style",
  });
};
SafeAreaView.displayName = "CSS(SafeAreaView)";

// TextInput
export const TextInput = (
  props: React.ComponentProps<typeof RNTextInput> & { className?: string }
) => {
  return useCssElement(RNTextInput as React.ComponentType<any>, props, {
    className: "style",
  });
};
TextInput.displayName = "CSS(TextInput)";

// AnimatedScrollView
export const AnimatedScrollView = (
  props: React.ComponentProps<typeof Animated.ScrollView> & {
    className?: string;
    contentClassName?: string;
    contentContainerClassName?: string;
  }
) => {
  return useCssElement(Animated.ScrollView as React.ComponentType<any>, props, {
    className: "style",
    contentClassName: "contentContainerStyle",
    contentContainerClassName: "contentContainerStyle",
  });
};

// TouchableHighlight with underlayColor extraction
function XXTouchableHighlight(
  props: React.ComponentProps<typeof RNTouchableHighlight>
) {
  const { underlayColor, ...style } = (StyleSheet.flatten(props.style) ||
    {}) as { underlayColor?: string } & Record<string, unknown>;
  return (
    <RNTouchableHighlight
      underlayColor={underlayColor}
      {...props}
      style={style}
    />
  );
}

export const TouchableHighlight = (
  props: React.ComponentProps<typeof RNTouchableHighlight>
) => {
  return useCssElement(XXTouchableHighlight as React.ComponentType<any>, props, {
    className: "style",
  });
};
TouchableHighlight.displayName = "CSS(TouchableHighlight)";

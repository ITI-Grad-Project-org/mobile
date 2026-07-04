import { useCSSVariable } from "@/tw";
import { SymbolView } from "expo-symbols";
import React from "react";
import { useCssElement } from "react-native-css";

const CSSSymbolView = (props: React.ComponentProps<typeof SymbolView> & { className?: string }) => {
  return useCssElement(SymbolView as React.ComponentType<any>, props, { className: "style" });
};

export type IconName =
  | "chevron-right"
  | "chevron-left"
  | "check"
  | "apple"
  | "droplets"
  | "dumbbell"
  | "flame"
  | "x"
  | "play"
  | "sun"
  | "moon"
  | "bell"
  | "person"
  | "wave"
  | "clock"
  | "layers"
  | "heart"
  | "waves"
  | "wind"
  | "sparkles"
  | "activity"
  | "help-circle"
  | "send"
  | "trending-up"

interface IconProps {
  name: IconName;
  size?: number;
  color?: string; // hex, raw color, or CSS var name e.g. '--peach-ink'
  className?: string;
}

const SYMBOLS: Record<IconName, { ios: string; android: string }> = {
  "chevron-right": { ios: "chevron.right", android: "chevron_right" },
  "chevron-left": { ios: "chevron.left", android: "chevron_left" },
  "check": { ios: "checkmark", android: "check" },
  "apple": { ios: "applelogo", android: "restaurant" },
  "droplets": { ios: "drop.fill", android: "water_drop" },
  "dumbbell": { ios: "dumbbell.fill", android: "fitness_center" },
  "flame": { ios: "flame.fill", android: "local_fire_department" },
  "x": { ios: "xmark", android: "close" },
  "play": { ios: "play.fill", android: "play_arrow" },
  "sun": { ios: "sun.max.fill", android: "light_mode" },
  "moon": { ios: "moon.fill", android: "dark_mode" },
  "bell": { ios: "bell.fill", android: "notifications" },
  "person": { ios: "person.crop.circle.fill", android: "account_circle" },
  "wave": { ios: "hand.wave.fill", android: "waving_hand" },
  "clock": { ios: "clock", android: "schedule" },
  "layers": { ios: "square.stack.3d.up", android: "layers" },
  "heart": { ios: "heart.fill", android: "favorite" },
  "waves": { ios: "water.waves", android: "waves" },
  "wind": { ios: "wind", android: "air" },
  "sparkles": { ios: "sparkles", android: "auto_awesome" },
  "activity": { ios: "waveform.path.ecg", android: "monitor_heart" },
  "help-circle": { ios: "questionmark.circle", android: "help" },
  "send": { ios: "paperplane.fill", android: "send" },
  "trending-up": { ios: "chart.line.uptrend.xyaxis", android: "trending_up" },
};

export function Icon({ name, size = 20, color = "#000000", className }: IconProps) {
  const sym = SYMBOLS[name];
  const isVar = color.startsWith("--");
  const resolvedColor = useCSSVariable(isVar ? color : "") as string | undefined;

  return (
    <CSSSymbolView
      name={sym as any}
      size={size}
      tintColor={isVar ? (resolvedColor ?? "#000000") : color}
      className={className}
    />
  );
}

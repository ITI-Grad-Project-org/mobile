import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Pressable } from "@/tw";

const LIQUID_GLASS = isLiquidGlassAvailable();

export function GlassButton({
  onPress,
  children,
  className,
  accessibilityLabel,
  hitSlop = 8,
}: {
  onPress: () => void;
  children: ReactNode;
  className?: string;
  accessibilityLabel?: string;
  hitSlop?: number;
}) {
  const inner = (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      className={cn(
        "items-center justify-center active:opacity-70",
        !LIQUID_GLASS && "bg-secondary",
        className
      )}
    >
      {children}
    </Pressable>
  );

  if (!LIQUID_GLASS) return inner;

  return (
    <GlassView
      glassEffectStyle="regular"
      isInteractive
      style={{ borderRadius: 9999, overflow: "hidden" }}
    >
      {inner}
    </GlassView>
  );
}

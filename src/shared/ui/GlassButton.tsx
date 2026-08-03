import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import React, { type ReactNode } from "react";
import { useCssElement } from "react-native-css";

import { cn } from "@/lib/utils";
import { Pressable } from "@/tw";

const LIQUID_GLASS = isLiquidGlassAvailable();

/**
 * className has to reach the GlassView, not the Pressable inside it: the glass
 * surface is the outer element, so it owns the size, radius, and any absolute
 * positioning. Putting those on the inner Pressable leaves the wrapper
 * unsized and unpositioned.
 */
const CSSGlassView = (
  props: React.ComponentProps<typeof GlassView> & { className?: string }
) => useCssElement(GlassView as React.ComponentType<any>, props, { className: "style" });

export function GlassButton({
  onPress,
  children,
  className,
  accessibilityLabel,
  disabled,
  hitSlop = 8,
}: {
  onPress: () => void;
  children: ReactNode;
  className?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  hitSlop?: number;
}) {
  if (!LIQUID_GLASS) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={hitSlop}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={cn(
          "items-center justify-center bg-secondary active:opacity-70",
          disabled && "opacity-40",
          className
        )}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <CSSGlassView
      glassEffectStyle="regular"
      isInteractive={!disabled}
      className={cn(
        // self-start so the wrapper hugs its content instead of stretching to
        // fill the cross axis — otherwise a back button spans the whole row.
        "self-start items-center justify-center overflow-hidden rounded-full",
        disabled && "opacity-40",
        className
      )}
    >
      <Pressable
        onPress={onPress}
        hitSlop={hitSlop}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        // Fills whatever the glass surface was sized to, so the tap target
        // matches the visible button rather than just the icon.
        className="flex-1 self-stretch items-center justify-center active:opacity-70"
      >
        {children}
      </Pressable>
    </CSSGlassView>
  );
}

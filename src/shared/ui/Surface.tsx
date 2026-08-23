import { cn } from "@/lib/utils";
import { Pressable, View, useCSSVariable, type ViewProps } from "@/tw";
import { GlassSheen } from "@/tw/Tone";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

/**
 * The one elevated-surface recipe. Every card and row on a rebuilt screen goes
 * through this so the fill, the radius and the highlight stay in one place.
 *
 * Two things the web recipe asks for can't be written as class names in RN:
 *
 * 1. `bg-gradient-to-br from-surface-hi to-surface-lo` — RN has no
 *    background-image, so that class compiles to nothing and the card renders
 *    transparent. The gradient is expo-linear-gradient fed by the same theme
 *    variables (read through useCSSVariable), which is also why it flips with
 *    the color scheme for free. Same approach as src/tw/Tone.tsx.
 * 2. The inset sheen shadow — an arbitrary `shadow-[...]` value compiles into a
 *    five-way --tw-* var chain, and nothing in this app uses that path (every
 *    working shadow here is a theme key). The sheen is an absolutely-filled
 *    hairline ring instead: RN lays absolute children
 *    out against the padding box, so it lands exactly one border-width inside,
 *    which is where an inset shadow draws. A full ring rather than top-left
 *    only — at 5.5% alpha the asymmetry is invisible, and border-t/border-l
 *    mitre badly around a radius.
 */

/** Maps to --radius-*; keeps the outer view and the sheen ring concentric. */
export type SurfaceRadius = "none" | "sm" | "md" | "lg" | "xl";

const RADIUS: Record<SurfaceRadius, string> = {
  none: "",
  sm: "rounded-sm", // 16px
  md: "rounded-md", // 18px — the row/tile radius
  lg: "rounded-lg", // 20px — the card radius
  xl: "rounded-xl", // 24px
};

export interface SurfaceProps extends ViewProps {
  /** Gradient start, a CSS variable NAME (not a color). */
  from?: string;
  /** Gradient end, a CSS variable NAME. */
  to?: string;
  /** CSS gradient angle in degrees: 0 = to top, 135 = to bottom-right. */
  angle?: number;
  /** The inner hairline highlight. */
  sheen?: boolean;
  /**
   * Frosted finish: the fill goes translucent so the background bleeds
   * through, and the glossy diagonal pass from Tone lands on top. Replaces the
   * hairline with the brighter white rim the rest of the app uses for glass.
   */
  glass?: boolean;
  radius?: SurfaceRadius;
  /** Renders a Pressable instead of a View, with the standard active state. */
  onPress?: () => void;
}

/**
 * CSS gradient angle -> expo-linear-gradient start/end in the unit square.
 * 135deg gives {0.146,0.146} -> {0.854,0.854} (to bottom-right).
 *
 * Unlike CSS this does not correct for the box's aspect ratio, so 140deg on a
 * wide row reads a little shallower than it would on the web. Fine for a
 * two-stop tint; don't reach for it to place a hard color stop.
 */
export function angleToPoints(deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  return {
    start: { x: 0.5 - dx / 2, y: 0.5 - dy / 2 },
    end: { x: 0.5 + dx / 2, y: 0.5 + dy / 2 },
  };
}

export function Surface({
  from = "--surface-hi",
  to = "--surface-lo",
  angle = 135,
  sheen = true,
  glass,
  radius = "md",
  onPress,
  children,
  className,
  ...rest
}: SurfaceProps) {
  const fromColor = useCSSVariable(from) as string | undefined;
  const toColor = useCSSVariable(to) as string | undefined;

  if (__DEV__ && (!fromColor || !toColor)) {
    // The signature of a token that was added to @theme inline but not to
    // :root (or not to the dark block) — otherwise an invisible failure.
    console.warn(
      `[Surface] Unresolved gradient token: ${!fromColor ? from : to}. ` +
        `Every token needs an entry in @theme inline AND :root AND the dark media query.`
    );
  }

  const { start, end } = angleToPoints(angle);
  const Root = onPress ? Pressable : View;

  return (
    // The caller's className lands last and on the element that holds the
    // children, so padding / flex-row / border-danger all apply where expected.
    <Root
      onPress={onPress}
      className={cn(
        "overflow-hidden",
        RADIUS[radius],
        // The rim and lift that make the sheen read as a lens rather than a
        // smear. Placed before `className` so a caller's border still wins.
        glass && "border border-white/30 shadow-pop",
        onPress && "active:opacity-90",
        className
      )}
      {...rest}
    >
      {/* The opacity rides on a wrapper class rather than a style prop on the
          gradient — same effect as Tone's `glass`, no inline style object. */}
      <View
        className={cn("absolute inset-0", glass && "opacity-80")}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[fromColor ?? "transparent", toColor ?? "transparent"]}
          start={start}
          end={end}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>
      {glass ? <GlassSheen /> : null}
      {/* The hairline is what stands in for an inset shadow on a solid card;
          glass has the brighter white rim instead, so they never stack. */}
      {sheen && !glass ? (
        <View
          className={cn("absolute inset-0 border border-white/5.5", RADIUS[radius])}
          pointerEvents="none"
        />
      ) : null}
      {children}
    </Root>
  );
}
Surface.displayName = "Surface";

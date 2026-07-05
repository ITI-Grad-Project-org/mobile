import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cn } from "@/lib/utils";
import { View, useCSSVariable, type ViewProps } from "./index";

/**
 * Native equivalent of the web `tone-*` utilities. RN has no `background-image`,
 * so the gradient is rendered with expo-linear-gradient using the SAME theme
 * variables (--mint / --mint-ink, etc.). Light/dark is automatic because the
 * variables flip with the color scheme.
 *
 * Usage:
 *   <Tone name="mint" className="rounded-3xl p-5">
 *     <Text className="text-mint-ink font-display">Streak</Text>
 *   </Tone>
 */
export type ToneName =
  | "mint"
  | "lilac"
  | "sky"
  | "peach"
  | "sun"
  | "ink"
  | "primary";

type ToneSpec = { from: string; to: string; mix: number };

// from -> to are CSS variable names; `mix` is how far the end stop blends to `to`.
const TONES: Record<ToneName, ToneSpec> = {
  mint: { from: "--mint", to: "--mint-ink", mix: 0.22 },
  lilac: { from: "--lilac", to: "--lilac-ink", mix: 0.22 },
  sky: { from: "--sky", to: "--sky-ink", mix: 0.22 },
  peach: { from: "--peach", to: "--peach-ink", mix: 0.22 },
  sun: { from: "--sun", to: "--sun-ink", mix: 0.22 },
  ink: { from: "--ink", to: "--primary", mix: 0.25 },
  primary: { from: "--primary", to: "--foreground", mix: 0.25 },
};

type RGBA = { r: number; g: number; b: number; a: number };

function parseColor(input: string | undefined): RGBA | null {
  if (!input) return null;
  const s = input.trim();
  const hex = s.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  const fn = s.match(/rgba?\(([^)]+)\)/i);
  if (fn) {
    const parts = fn[1].split(/[, /]+/).filter(Boolean).map(Number);
    if (parts.length >= 3)
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: parts[3] ?? 1,
      };
  }
  return null;
}

function toRgba({ r, g, b, a }: RGBA): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t,
  };
}

const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 1 };

export type ToneProps = ViewProps & {
  name: ToneName;
  raised?: boolean;
  /** Overlay a frosted liquid-glass finish (translucent tint + glossy sheen). */
  glass?: boolean;
};

/**
 * The glossy passes that make a filled surface read as "liquid glass": a bright
 * diagonal sheen plus a faint bottom shade. Drop these over any fill (a Tone
 * gradient, or a neutral frosted View) beneath the content.
 */
export function GlassSheen() {
  return (
    <>
      <LinearGradient
        colors={[
          "rgba(255,255,255,0.55)",
          "rgba(255,255,255,0.14)",
          "rgba(255,255,255,0)",
        ]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.65, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(15,23,42,0.08)"]}
        start={{ x: 0.5, y: 0.55 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </>
  );
}
GlassSheen.displayName = "GlassSheen";

export function Tone({
  name,
  raised,
  glass,
  children,
  style,
  ...rest
}: ToneProps) {
  const spec = TONES[name];
  const fromVar = useCSSVariable(spec.from) as string | undefined;
  const toVar = useCSSVariable(spec.to) as string | undefined;

  const from = parseColor(fromVar);
  const to = parseColor(toVar);

  let colors: [string, string, ...string[]];
  if (from && to) {
    colors = raised
      ? [
          toRgba(mix(from, WHITE, 0.22)),
          toRgba(from),
          toRgba(mix(from, BLACK, 0.2)),
        ]
      : [
          toRgba(mix(from, WHITE, 0.06)),
          toRgba(from),
          toRgba(mix(from, to, spec.mix)),
        ];
  } else {
    const flat = fromVar ?? "transparent";
    colors = [flat, flat];
  }

  return (
    <View
      style={style}
      {...rest}
      className={cn(
        "overflow-hidden",
        // glass: hairline highlight rim + lift so the sheen reads as a lens.
        glass && "border border-white/30 shadow-pop",
        rest.className
      )}
    >
      <LinearGradient
        colors={colors}
        // raised: straight top -> bottom; default: 135deg top-left -> bottom-right
        start={raised ? { x: 0.5, y: 0 } : { x: 0, y: 0 }}
        end={raised ? { x: 0.5, y: 1 } : { x: 1, y: 1 }}
        // glass keeps the fill translucent so the background bleeds through.
        style={[StyleSheet.absoluteFill, glass ? { opacity: 0.8 } : null]}
        pointerEvents="none"
      />
      {glass ? <GlassSheen /> : null}
      {children}
    </View>
  );
}

Tone.displayName = "Tone";

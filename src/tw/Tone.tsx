import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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

export type ToneProps = ViewProps & { name: ToneName };

export function Tone({ name, children, style, ...rest }: ToneProps) {
  const spec = TONES[name];
  const fromVar = useCSSVariable(spec.from) as string | undefined;
  const toVar = useCSSVariable(spec.to) as string | undefined;

  const from = parseColor(fromVar);
  const to = parseColor(toVar);

  // Subtle 3-stop ramp mirroring the web tone-* gradients (lightened start,
  // base middle, slightly ink-blended end). Falls back to the flat base color.
  let colors: [string, string, ...string[]];
  if (from && to) {
    colors = [
      toRgba(mix(from, WHITE, 0.06)),
      toRgba(from),
      toRgba(mix(from, to, spec.mix)),
    ];
  } else {
    const flat = fromVar ?? "transparent";
    colors = [flat, flat];
  }

  return (
    <View style={style} {...rest} className={`overflow-hidden ${rest.className ?? ""}`}>
      <LinearGradient
        colors={colors}
        // 135deg ≈ top-left -> bottom-right
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

Tone.displayName = "Tone";

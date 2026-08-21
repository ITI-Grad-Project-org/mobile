import { cn } from "@/lib/utils";
import { Pressable, Text, TextInput, View, useCSSVariable } from "@/tw";
import { Animated } from "@/tw/animated";
import { Tone, type ToneName } from "@/tw/Tone";
import { Icon } from "@/shared/ui/Icon";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { MAX_PROMPT_LENGTH } from "../types";

// Apple Liquid Glass is iOS 26+ only — fall back to a frosted pill elsewhere.
const LIQUID_GLASS = isLiquidGlassAvailable();

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  placeholder: string;
  /** The accent the breathing glow behind the pill is drawn in. */
  glowTone: ToneName;
  /** Rendered above the counter — the coach's client-scope chip. */
  accessory?: ReactNode;
}

/**
 * The assistant input pill, shared by both UIs so they cannot drift apart.
 *
 * Deliberately single-line: the prompt is one question, and a growing
 * multiline box pushes the thread around while the user types.
 */
export function AssistantComposer({
  value,
  onChangeText,
  onSend,
  onStop,
  busy,
  placeholder,
  glowTone,
  accessory,
}: Props) {
  const placeholderColor = useCSSVariable("--muted-foreground");

  const trimmed = value.trim();
  const tooLong = trimmed.length > MAX_PROMPT_LENGTH;
  const canSend = Boolean(trimmed) && !busy && !tooLong;

  const glow = useSharedValue(0);
  useEffect(() => {
    if (busy) {
      glow.value = withRepeat(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      );
    } else {
      glow.value = withTiming(0, { duration: 450 });
    }
  }, [busy, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + glow.value * 0.55,
    transform: [{ scaleX: 1 + glow.value * 0.04 }, { scaleY: 1 + glow.value * 0.12 }],
  }));

  // The `+` (attach) and mic (voice) affordances were removed: neither had a
  // handler, and the protocol takes a text prompt only.
  const controls = (
    <>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSend}
        editable={!busy}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        className="min-w-0 flex-1 self-center bg-transparent px-3 py-2 text-[14.5px] leading-tight text-foreground"
      />
      {busy ? (
        <Pressable
          onPress={onStop}
          className="h-10 w-10 items-center justify-center rounded-full bg-foreground active:opacity-85"
          accessibilityLabel="Stop"
        >
          {/* A filled square: the universal stop glyph, and the Icon set has
              no dedicated one. */}
          <View className="h-3 w-3 rounded-[3px] bg-background" />
        </Pressable>
      ) : (
        <Pressable
          onPress={onSend}
          // One un-acknowledged ask at a time: this is both the correlation
          // guarantee and the only brake on an unthrottled, quota-billed
          // socket path.
          disabled={!canSend}
          className={cn(
            "h-10 w-10 items-center justify-center rounded-full bg-foreground active:opacity-85",
            !canSend && "opacity-40"
          )}
          accessibilityLabel="Send"
        >
          <Icon name="arrow-up" size={18} color="--background" />
        </Pressable>
      )}
    </>
  );

  return (
    <>
      {(accessory || tooLong) && (
        <View className="pt-3">
          {accessory}
          {tooLong && (
            <Text className="mb-1.5 px-1 text-[11.5px] text-destructive">
              {trimmed.length.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()}{" "}
              characters — shorten the question to send it.
            </Text>
          )}
        </View>
      )}

      {/* Its own relative box: the glow is an absoluteFill sibling of the pill
          and must not stretch over the accessory above it. */}
      <View
        className={cn("relative", !accessory && !tooLong && "mt-3")}
        style={{ marginBottom: 8 }}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glowStyle]}>
          <Tone name={glowTone} className="h-full w-full rounded-full opacity-60" />
        </Animated.View>

        {LIQUID_GLASS ? (
          <GlassView
            glassEffectStyle="regular"
            isInteractive
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              padding: 6,
              borderRadius: 9999,
            }}
          >
            {controls}
          </GlassView>
        ) : (
          <View className="flex-row items-center gap-2 rounded-full border border-border/60 bg-card/80 p-1.5 shadow-soft">
            {controls}
          </View>
        )}
      </View>
    </>
  );
}

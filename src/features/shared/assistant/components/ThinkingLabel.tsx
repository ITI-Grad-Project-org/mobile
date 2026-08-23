import { Text, View } from "@/tw";
import { Animated } from "@/tw/animated";
import { useEffect, useState } from "react";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

/**
 * A multi-second wait needs to look like work, not like a hang. Cycling the
 * verb is the cheapest way to say "still going" without implying progress we
 * can't measure — the gateway reports no intermediate state, only the finished
 * answer.
 */
const WORDS = [
  "Thinking",
  "Reading your library",
  "Checking the plan",
  "Connecting the dots",
  "Weighing the options",
  "Pulling it together",
  "Almost there",
];

/** Long enough to read, short enough that it never looks stuck. */
const ROTATE_MS = 2600;

export function ThinkingLabel({ slow = false }: { slow?: boolean }) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const fade = useSharedValue(1);

  // Coach questions scoped to a client are genuinely slow — they retrieve that
  // client's intake and check-ins before the model runs, and can outlast the
  // server's own advisory timeout. A counter makes a long wait legible as work
  // rather than as a stuck screen.
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      // Cross-fade rather than a hard swap: a word appearing instantly at a
      // different width reads as a glitch.
      fade.value = withSequence(
        withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 320, easing: Easing.in(Easing.quad) })
      );
      // Swap at the trough of the fade.
      setTimeout(() => setIndex((i) => (i + 1) % WORDS.length), 220);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [fade]);

  const textStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  // Once the server has told us it's slow, stop pretending it's nearly done.
  const label = slow ? `Still thinking · ${elapsed}s` : WORDS[index];

  return (
    <View className="flex-row items-center gap-2">
      <Animated.View style={slow ? undefined : textStyle}>
        <Text className="text-[13px] text-muted-foreground">{label}</Text>
      </Animated.View>
      <Dots />
    </View>
  );
}

/** Opacity for one dot at offset `i` of a 3-wide travelling wave. */
function waveOpacity(t: number, i: number): number {
  "worklet";
  const phase = (t - i + 3) % 3;
  if (phase < 1) return 0.35 + phase * 0.65;
  if (phase < 2) return 1 - (phase - 1) * 0.65;
  return 0.35;
}

function Dots() {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(3, { duration: 1200, easing: Easing.linear }), -1, false);
  }, [t]);

  // Each dot brightens in turn — the same three-dot vocabulary the message
  // bubbles already use, just sequenced. Written out rather than mapped:
  // useAnimatedStyle is a hook and cannot be called from inside a loop.
  const d0 = useAnimatedStyle(() => ({ opacity: waveOpacity(t.value, 0) }));
  const d1 = useAnimatedStyle(() => ({ opacity: waveOpacity(t.value, 1) }));
  const d2 = useAnimatedStyle(() => ({ opacity: waveOpacity(t.value, 2) }));

  return (
    <View className="flex-row items-center gap-1">
      <Animated.View style={d0} className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
      <Animated.View style={d1} className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
      <Animated.View style={d2} className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
    </View>
  );
}

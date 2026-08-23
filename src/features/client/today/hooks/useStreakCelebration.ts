import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";

const highWater = new Map<string, number>();

const CELEBRATION_MS = 1600;
const COUNT_UP_MS = 600;

export interface StreakCelebration {
  pulse: number;
  /** The streak to render — ramps up from 0 while celebrating. */
  streak: number;
  /** The streak the ramp is heading for, for copy that shouldn't count up. */
  streakTarget: number;
}

interface Options {
  /** Today in the activity graph's timezone. */
  todayIso: string;
  /** Today's intensity, 0–4, including locally-ticked exercises. */
  todayLevel: number;
  /** `summary.currentStreakDays` from the API. */
  streakDays: number;
  /** Hold off until the caller's data has settled. */
  enabled: boolean;
}

// easeOutCubic — the count lands softly rather than stopping dead.
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export function useStreakCelebration({
  todayIso,
  todayLevel,
  streakDays,
  enabled,
}: Options): StreakCelebration {
  const reduceMotion = useReducedMotion();
  const [pulse, setPulse] = useState(0);
  const [counting, setCounting] = useState(false);
  const [counted, setCounted] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Today is logged, so the streak is at least a day — the server may not have
  // counted the session yet, and showing "0 days" under a lit square reads as a bug.
  const streakTarget = todayLevel > 0 ? Math.max(streakDays, 1) : streakDays;

  const start = useCallback(() => {
    setPulse((n) => n + 1);
    setCounting(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCounting(false), CELEBRATION_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  useEffect(() => {
    if (!enabled || todayLevel <= 0) return;
    if (todayLevel <= (highWater.get(todayIso) ?? 0)) return;

    highWater.set(todayIso, todayLevel);
    if (reduceMotion) return;
    start();
  }, [enabled, todayIso, todayLevel, reduceMotion, start]);

  useEffect(() => {
    if (!counting) {
      setCounted(null);
      return;
    }
    const from = Date.now();
    let frame = requestAnimationFrame(function tick() {
      const t = Math.min(1, (Date.now() - from) / COUNT_UP_MS);
      setCounted(Math.round(streakTarget * ease(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [counting, pulse, streakTarget]);

  return { pulse, streak: counted ?? streakTarget, streakTarget };
}

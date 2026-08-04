import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_REST_SECONDS = 90;

/**
 * A single rest countdown for the whole session. It lives at the screen level so
 * it keeps ticking while the client swipes between exercises.
 */
export function useRestTimer() {
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    clear();
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clear();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clear]);

  const start = useCallback(
    (seconds: number) => {
      const secs = Math.max(1, Math.round(seconds));
      setTotalSeconds(secs);
      setRemaining(secs);
      tick();
    },
    [tick]
  );

  const extend = useCallback(
    (seconds: number) => {
      setTotalSeconds((prev) => prev + seconds);
      setRemaining((prev) => prev + seconds);
      if (!intervalRef.current) tick();
    },
    [tick]
  );

  const skip = useCallback(() => {
    clear();
    setRemaining(0);
    setTotalSeconds(0);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return {
    isResting: remaining > 0,
    remaining,
    totalSeconds,
    start,
    extend,
    skip,
  };
}

/** Seconds elapsed since `startedAt`, refreshed once a second. */
export function useElapsedSeconds(startedAt: number | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return elapsed;
}

/** 125 -> "2:05", 3725 -> "62:05". */
export function formatClock(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(secs / 60);
  return `${mins}:${String(secs % 60).padStart(2, "0")}`;
}

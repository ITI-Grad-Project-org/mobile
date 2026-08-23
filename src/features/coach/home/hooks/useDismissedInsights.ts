import { useCallback, useState } from "react";

const dismissed = new Set<string>();

export function useDismissedInsights() {
  // The Set is mutated in place, so bump a counter to re-render.
  const [, bump] = useState(0);

  const dismiss = useCallback((key: string) => {
    dismissed.add(key);
    bump((n) => n + 1);
  }, []);

  const isDismissed = useCallback((key: string | undefined) => {
    return key ? dismissed.has(key) : false;
  }, []);

  return { dismiss, isDismissed };
}

import type { ReactNode } from "react";

import { Text } from "@/tw";

/**
 * The all-caps section label used by every section on the coach profile.
 * One component so the tracking and the size can't drift between them.
 */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </Text>
  );
}

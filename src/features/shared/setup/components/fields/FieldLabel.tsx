import type { ReactNode } from "react";

import { Text, View } from "@/tw";

/** Uppercase caption above a field's control, matching the web `wrap()` helper. */
export function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Text>
      {children}
    </View>
  );
}

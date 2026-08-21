import { cn } from "@/lib/utils";
import { Text, View } from "@/tw";
import type { ReactNode } from "react";

interface StatCellProps {
  value: string;
  /** Rides inside the value at a smaller size — "185" + "g". */
  unit?: string;
  label: string;
  /**
   * Sits beside the value on the same baseline row — a rating star, nothing
   * heavier. Only when this is set does the value get wrapped in a row, so
   * every existing caller renders byte-for-byte as before.
   */
  trailing?: ReactNode;
  /**
   * Overrides the value's colour. The one real use is a cell with no data to
   * show: "—" belongs in muted, not in foreground where it reads as a result.
   */
  valueClassName?: string;
  className?: string;
}

/** One metadata cell in a card's data row: value over an all-caps label. */
export function StatCell({
  value,
  unit,
  label,
  trailing,
  valueClassName,
  className,
}: StatCellProps) {
  const valueNode = (
    <Text
      className={cn("text-[16px] font-semibold text-foreground", valueClassName)}
      numberOfLines={1}
    >
      {value}
      {unit ? <Text className="text-[12px] text-muted-foreground">{unit}</Text> : null}
    </Text>
  );

  return (
    <View className={cn("flex-1 gap-1.5", className)}>
      {trailing ? (
        <View className="flex-row items-center gap-1">
          {valueNode}
          {trailing}
        </View>
      ) : (
        valueNode
      )}
      <Text className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

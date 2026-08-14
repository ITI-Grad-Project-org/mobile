import { cn } from "@/lib/utils";
import { Text, View } from "@/tw";

interface StatCellProps {
  value: string;
  /** Rides inside the value at a smaller size — "185" + "g". */
  unit?: string;
  label: string;
  className?: string;
}

/** One metadata cell in a card's data row: value over an all-caps label. */
export function StatCell({ value, unit, label, className }: StatCellProps) {
  return (
    <View className={cn("flex-1 gap-1.5", className)}>
      <Text className="text-[16px] font-semibold text-foreground" numberOfLines={1}>
        {value}
        {unit ? <Text className="text-[12px] text-muted-foreground">{unit}</Text> : null}
      </Text>
      <Text className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

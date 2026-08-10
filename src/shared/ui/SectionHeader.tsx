import { Text, View } from "@/tw";

/** Section label with an optional right-aligned count. */
export function SectionHeader({ label, hint }: { label: string; hint?: string | null }) {
  return (
    <View className="flex-row items-baseline gap-2">
      <Text className="flex-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </Text>
      {hint ? <Text className="text-[11px] text-muted-foreground">{hint}</Text> : null}
    </View>
  );
}

import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { Pressable, Text } from "@/tw";

interface FilterPillProps {
  label: string;
  /** Active = a filter is actually applied, which is what earns the accent. */
  active: boolean;
  icon?: IconName;
  onPress: () => void;
}

/** Trigger pill for a filter that opens a sheet rather than toggling in place. */
export function FilterPill({ label, active, icon, onPress }: FilterPillProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      className={cn(
        "h-8 flex-row items-center gap-1.5 rounded-full border px-3 active:opacity-80",
        active ? "border-primary" : "border-border"
      )}
    >
      {icon ? (
        <Icon name={icon} size={13} color={active ? "--primary" : "--muted-foreground"} />
      ) : null}
      <Text
        className={cn(
          "text-[12.5px] font-medium capitalize",
          active ? "text-primary" : "text-foreground/80"
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

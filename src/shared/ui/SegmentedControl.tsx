import { cn } from "@/lib/utils";
import { Pressable, Text, View } from "@/tw";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  /** Track classes when this option is the active one, e.g. "bg-mint". */
  activeClassName?: string;
  /** Label classes when active, e.g. "text-mint-ink". */
  activeLabelClassName?: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <View
      className={cn(
        "flex-row items-center gap-0.5 rounded-full border border-border bg-card/60 p-0.75",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            // The row is 32px tall by design; hitSlop takes the touch target
            // past 44px without inflating the layout.
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            className={cn(
              "rounded-full px-3 py-1.5",
              active ? (option.activeClassName ?? "bg-foreground") : "bg-transparent"
            )}
          >
            <Text
              className={cn(
                "text-[12.5px]",
                active
                  ? cn("font-semibold", option.activeLabelClassName ?? "text-background")
                  : "font-medium text-muted-foreground"
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

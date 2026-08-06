import { Card } from "@/shared/ui/Card";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Text, View } from "@/tw";

interface WeekStepperProps {
  index: number;
  total: number;
  dateRange: string;
  /** Marks the week the athlete is actually in, wherever they've browsed to. */
  isCurrent: boolean;
  onChange: (index: number) => void;
}

export function WeekStepper({ index, total, dateRange, isCurrent, onChange }: WeekStepperProps) {
  return (
    <Card glass className="flex-row items-center justify-between p-2.5">
      <GlassButton
        onPress={() => onChange(index - 1)}
        disabled={index <= 0}
        className="h-11 w-11 rounded-full"
        accessibilityLabel="Previous week"
      >
        <Icon name="chevron-left" size={16} color="--foreground" />
      </GlassButton>

      <View className="items-center">
        <Text
          className={
            isCurrent
              ? "text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
              : "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          }
        >
          {isCurrent ? "Active" : "Week"}
        </Text>
        <Text className="text-[16px] font-bold text-foreground">
          Week {index + 1} of {total}
        </Text>
        {dateRange ? (
          <Text className="mt-0.5 text-[11px] text-muted-foreground">{dateRange}</Text>
        ) : null}
      </View>

      <GlassButton
        onPress={() => onChange(index + 1)}
        disabled={index >= total - 1}
        className="h-11 w-11 rounded-full"
        accessibilityLabel="Next week"
      >
        <Icon name="chevron-right" size={16} color="--foreground" />
      </GlassButton>
    </Card>
  );
}

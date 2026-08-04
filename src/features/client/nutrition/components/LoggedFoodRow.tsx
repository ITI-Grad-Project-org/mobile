import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { formatGrams, formatKcal, type LoggedFood } from "../data";

/** One food the client actually logged. Tap to edit the amount, trash to remove. */
export function LoggedFoodRow({
  food,
  disabled,
  isRemoving,
  onEdit,
  onRemove,
}: {
  food: LoggedFood;
  disabled?: boolean;
  isRemoving?: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { macros } = food;
  const amountLine =
    food.amount !== null
      ? `${food.amount}${food.servingUnit ? ` ${food.servingUnit}` : ""}`
      : null;

  const detail = [amountLine, food.brand].filter(Boolean).join(" · ");

  return (
    <View
      className={cn(
        "flex-row items-center gap-3 rounded-sm border border-border bg-secondary/40 px-3 py-2.5",
        isRemoving && "opacity-50"
      )}
    >
      <Pressable
        onPress={onEdit}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${food.name}`}
        className="min-w-0 flex-1 active:opacity-70"
      >
        <Text numberOfLines={1} className="text-[14px] font-semibold text-foreground">
          {food.name}
        </Text>
        <Text numberOfLines={1} className="text-[11.5px] text-muted-foreground">
          {detail ? `${detail} · ` : ""}P {formatGrams(macros.proteinG)} · C{" "}
          {formatGrams(macros.carbsG)} · F {formatGrams(macros.fatG)}
        </Text>
      </Pressable>

      <Text
        className="shrink-0 text-[14px] font-bold text-foreground"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {formatKcal(macros.calories)}
      </Text>

      {!disabled ? (
        <Pressable
          onPress={onRemove}
          disabled={isRemoving}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${food.name}`}
          className="shrink-0 active:opacity-60"
        >
          <Icon name="trash" size={14} color="--muted-foreground" />
        </Pressable>
      ) : null}
    </View>
  );
}

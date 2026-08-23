import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, View } from "@/tw";

const STARS = [1, 2, 3, 4, 5];

export function StarRating({
  value,
  size = 14,
  onChange,
  color = "--sun-ink",
  className,
}: {
  value: number;
  size?: number;
  /** Pass to make the row interactive (tap a star to set 1–5). */
  onChange?: (rating: number) => void;
  /**
   * Filled-glyph colour, as a CSS variable NAME. Defaults to --sun-ink, which
   * is what the coach-side review surfaces are tuned around; the client's coach
   * profile passes --star, the standalone rating gold.
   */
  color?: string;
  className?: string;
}) {
  const rounded = Math.round(value);

  return (
    <View
      className={cn("flex-row items-center gap-0.5", className)}
      accessibilityRole={onChange ? "adjustable" : "image"}
      accessibilityLabel={`${value} out of 5 stars`}
    >
      {STARS.map((star) => {
        const filled = star <= rounded;
        const icon = (
          <Icon
            name={filled ? "star" : "star-outline"}
            size={size}
            color={filled ? color : "--muted-foreground"}
          />
        );

        if (!onChange) return <View key={star}>{icon}</View>;

        return (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            accessibilityLabel={`Rate ${star} star${star === 1 ? "" : "s"}`}
            className="p-1 active:opacity-60"
          >
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}

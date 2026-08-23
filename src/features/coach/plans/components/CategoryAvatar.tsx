import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { View } from "@/tw";
import type { PlanKind } from "../lib/normalizePlan";

/**
 * The single source of the category mapping: mint = nutrition, lilac =
 * training. Nothing else in the plans UI decides a category colour.
 */
const CATEGORY = {
  nutrition: {
    surface: "bg-mint border-mint/30",
    ink: "--mint-ink",
    icon: "apple",
  },
  training: {
    surface: "bg-lilac border-lilac/30",
    ink: "--lilac-ink",
    icon: "dumbbell",
  },
} as const;

/** Fixed sizes only — a computed `w-[${n}px]` would never reach the compiler. */
const SIZES = {
  md: { box: "w-9.5 h-9.5", icon: 18 },
  sm: { box: "w-7.5 h-7.5", icon: 14 },
} as const;

interface CategoryAvatarProps {
  type: PlanKind;
  size?: keyof typeof SIZES;
  className?: string;
}

export function CategoryAvatar({ type, size = "md", className }: CategoryAvatarProps) {
  const category = CATEGORY[type];
  const dimensions = SIZES[size];

  return (
    <View
      className={cn(
        "items-center justify-center rounded-full border",
        dimensions.box,
        category.surface,
        className
      )}
    >
      <Icon name={category.icon} size={dimensions.icon} color={category.ink} />
    </View>
  );
}

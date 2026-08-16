import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { Surface } from "@/shared/ui/Surface";
import { Pressable, Text, View } from "@/tw";

/** The visual size is fixed by the design, so buy back the 44px target here. */
const PILL_HIT_SLOP = { top: 8, bottom: 8, left: 6, right: 6 };

interface AttentionRowProps {
  tone: "danger" | "neutral";
  /**
   * The tint the row fades from, as a CSS variable NAME. Each queue keeps its
   * own colour (danger / info / lilac) and every one of them fades to --card,
   * so the fill reads as a tint rather than a filled block.
   */
  fromVar: string;
  /** Danger rows carry a glyph; neutral rows carry the queue size. */
  icon?: IconName;
  count?: number;
  bubbleClassName: string;
  bubbleTextClassName?: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  onPress: () => void;
  /** Set on the most urgent row only — exactly one filled pill per screen. */
  emphasis?: boolean;
}

export function AttentionRow({
  tone,
  fromVar,
  icon,
  count,
  bubbleClassName,
  bubbleTextClassName,
  title,
  subtitle,
  actionLabel,
  onPress,
  emphasis,
}: AttentionRowProps) {
  const danger = tone === "danger";

  return (
    <Surface
      radius="md"
      from={fromVar}
      to="--card"
      angle={140}
      className={cn(
        "relative flex-row items-center gap-3 overflow-hidden px-3.25 py-3",
        // Lands after the glass rim, so tailwind-merge keeps the red border.
        danger && "border border-danger/26"
      )}
    >
      {danger ? (
        <View className="absolute inset-y-0 left-0 w-0.5 bg-primary" pointerEvents="none" />
      ) : null}

      <View
        className={cn(
          "h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full",
          bubbleClassName
        )}
      >
        {icon ? (
          <Icon name={icon} size={15} color="--danger" />
        ) : (
          <Text className={cn("text-[13px] font-bold", bubbleTextClassName)}>{count}</Text>
        )}
      </View>

      <View className="min-w-0 flex-1">
        <Text
          className="text-[14.5px] font-semibold leading-tight text-foreground"
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text
          className={cn("mt-0.5 text-xs", danger ? "text-danger-muted" : "text-muted-foreground")}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>

      {/* shrink-0, not a literal width: the verbs differ in length and a fixed
          width would clip "Reach out" to fit "Renew". */}
      <Pressable
        onPress={onPress}
        hitSlop={PILL_HIT_SLOP}
        className={cn(
          "shrink-0 items-center justify-center rounded-full px-3.5 py-2 active:opacity-85",
          emphasis ? "bg-primary" : "border border-border"
        )}
      >
        <Text
          className={cn(
            "text-[12.5px] font-semibold",
            emphasis ? "text-primary-foreground" : "text-foreground"
          )}
        >
          {actionLabel}
        </Text>
      </Pressable>
    </Surface>
  );
}
AttentionRow.displayName = "AttentionRow";

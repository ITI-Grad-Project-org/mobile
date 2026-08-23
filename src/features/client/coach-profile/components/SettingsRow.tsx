import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";

export interface SettingsRowProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  /**
   * `quiet` is for a row whose consequence is destructive. It is deliberately
   * NOT red: the list is where you read what a row does, and the confirm sheet
   * is where you're warned. A red row in a settings list trains people to
   * ignore red.
   */
  tone?: "default" | "quiet";
  disabled?: boolean;
  /** Row separator; the first row in a card omits it. */
  divided?: boolean;
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  tone = "default",
  disabled,
  divided,
}: SettingsRowProps) {
  const quiet = tone === "quiet";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      className={cn(
        "min-h-[56px] flex-row items-center gap-3 px-3.5 py-3 active:opacity-70",
        divided && "border-t border-border",
        disabled && "opacity-50"
      )}
    >
      <View
        className={cn(
          "h-9 w-9 shrink-0 items-center justify-center rounded-full",
          quiet ? "border border-border" : "bg-secondary"
        )}
      >
        <Icon name={icon} size={16} color={quiet ? "--muted-foreground" : "--foreground"} />
      </View>

      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className={cn(
            "text-[14.5px] font-semibold",
            quiet ? "text-foreground/80" : "text-foreground"
          )}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <Icon name="chevron-right" size={15} color="--muted-foreground" className="opacity-70" />
    </Pressable>
  );
}

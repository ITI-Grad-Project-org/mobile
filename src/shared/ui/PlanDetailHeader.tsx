import { cn } from "@/lib/utils";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Text, View } from "@/tw";
import { Tone, type ToneName } from "@/tw/Tone";
import { router } from "expo-router";

interface PlanDetailHeaderProps {
  title: string;
  subtitle: string | null;
  tags: string[];
  /** The small caps label above the title, e.g. "Published Program". */
  eyebrow: string;
  /** Lilac for training, mint for nutrition — matches each surface elsewhere. */
  tone?: ToneName;
}

/**
 * The identity panel at the top of a pushed plan-detail screen. Training and
 * nutrition share it so the two detail screens read as one pattern; only the
 * tone and the eyebrow tell them apart.
 */
export function PlanDetailHeader({
  title,
  subtitle,
  tags,
  eyebrow,
  tone = "lilac",
}: PlanDetailHeaderProps) {
  const ink = tone === "mint" ? "text-mint-ink" : "text-lilac-ink";
  const inkSubtle = tone === "mint" ? "text-mint-ink/80" : "text-lilac-ink/80";
  const chip = tone === "mint" ? "bg-mint-ink/15" : "bg-lilac-ink/15";

  return (
    <Tone name={tone} className="px-5 pt-4 pb-5" glass>
      <View className="flex-row items-center gap-3">
        <GlassButton
          onPress={() => router.back()}
          accessibilityLabel="Back"
          className="h-9 w-9 rounded-full"
        >
          <Icon name="chevron-left" size={16} color="--foreground" />
        </GlassButton>
        <Text
          className={cn(
            "flex-1 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80",
            ink
          )}
        >
          {eyebrow}
        </Text>
      </View>

      <Text className={cn("mt-3 text-[24px] font-bold leading-tight", ink)}>{title}</Text>
      {subtitle ? (
        <Text className={cn("mt-1.5 text-[13px] leading-relaxed", inkSubtle)} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}

      {tags.length > 0 ? (
        <View className="mt-3.5 flex-row flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <View key={tag} className={cn("rounded-full px-3 py-1", chip)}>
              <Text className={cn("text-[11px] font-bold uppercase", ink)}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Tone>
  );
}

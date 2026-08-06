import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Text, View } from "@/tw";
import { Tone } from "@/tw/Tone";
import { router } from "expo-router";

interface ProgramHeaderProps {
  title: string;
  subtitle: string | null;
  tags: string[];
}

/** The program identity panel — the same lilac glass surface the app uses for
 *  pushed-screen headers. */
export function ProgramHeader({ title, subtitle, tags }: ProgramHeaderProps) {
  return (
    <Tone name="lilac" className="px-5 pt-4 pb-5" glass>
      <View className="flex-row items-center gap-3">
        <GlassButton
          onPress={() => router.back()}
          accessibilityLabel="Back"
          className="h-9 w-9 rounded-full"
        >
          <Icon name="chevron-left" size={16} color="--foreground" />
        </GlassButton>
        <Text className="flex-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-lilac-ink opacity-80">
          Published Program
        </Text>
      </View>

      <Text className="mt-3 text-[24px] font-bold leading-tight text-lilac-ink">{title}</Text>
      {subtitle ? (
        <Text className="mt-1.5 text-[13px] leading-relaxed text-lilac-ink/80" numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}

      {tags.length > 0 ? (
        <View className="mt-3.5 flex-row flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <View key={tag} className="rounded-full bg-lilac-ink/15 px-3 py-1">
              <Text className="text-[11px] font-bold uppercase text-lilac-ink">{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Tone>
  );
}

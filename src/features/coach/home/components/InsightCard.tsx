import { Icon } from "@/shared/ui/Icon";
import { Surface } from "@/shared/ui/Surface";
import { Pressable, Text, View } from "@/tw";

const HIT_SLOP = { top: 8, bottom: 8, left: 6, right: 6 };

interface InsightCardProps {
  body: string;
  onDraft: () => void;
  onDismiss: () => void;
}

/**
 * The insight line. There is no assistant endpoint in v1, so `body` is
 * templated from the attention queues upstream — it restates a number the API
 * returned rather than asserting anything the app can't back up.
 */
export function InsightCard({ body, onDraft, onDismiss }: InsightCardProps) {
  return (
    <Surface
      radius="md"
      from="--indigo-tint"
      to="--card"
      angle={140}
      className="flex-row items-start gap-3 border border-lilac/28 p-4"
    >
      <View className="h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-lilac/16">
        <Icon name="sparkles" size={15} color="--lilac-ink" />
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-lilac-ink">
          AI insight
        </Text>
        <Text className="mt-1 text-[13.5px] leading-[1.45] text-foreground/90">{body}</Text>

        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={onDraft}
            hitSlop={HIT_SLOP}
            className="rounded-full bg-lilac px-3.5 py-2 active:opacity-85"
          >
            <Text className="text-[12.5px] font-semibold text-lilac-on">Draft message</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            hitSlop={HIT_SLOP}
            className="rounded-full px-3.5 py-2 active:opacity-70"
          >
            <Text className="text-[12.5px] font-semibold text-muted-foreground">Dismiss</Text>
          </Pressable>
        </View>
      </View>
    </Surface>
  );
}
InsightCard.displayName = "InsightCard";

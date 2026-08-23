import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import type { PlanClient, PlanKind } from "../lib/normalizePlan";
import { ClientAvatar } from "./ClientAvatar";

/**
 * The chat pill wears the plan's own category tone rather than the accent:
 * primary is spoken for by the create action and the active filter, and an
 * orange outline on a mint or lilac screen reads as a warning.
 */
const CHAT_TONE: Record<PlanKind, { chip: string; label: string; icon: string }> = {
  training: { chip: "bg-lilac", label: "text-lilac-ink", icon: "--lilac-ink" },
  nutrition: { chip: "bg-mint", label: "text-mint-ink", icon: "--mint-ink" },
};

interface PlanClientRowProps {
  client: PlanClient | null;
  /** "Started 4 days ago" — the plan's own timing, not the membership's. */
  since: string | null;
  /** Tints the chat pill to match the screen it sits on. */
  kind: PlanKind;
  /** Omitted when there is nowhere to go; the row then isn't pressable. */
  onPress?: () => void;
  /** Opens the thread with this client. Omitted when there's no client id. */
  onChat?: () => void;
}

export function PlanClientRow({ client, since, kind, onPress, onChat }: PlanClientRowProps) {
  const tone = CHAT_TONE[kind];
  const linked = Boolean(client);

  const body = (
    <>
      <ClientAvatar client={client} size="md" />

      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
          {client?.name ?? "No client linked"}
        </Text>
        <Text className="text-[11.5px] text-muted-foreground" numberOfLines={1}>
          {linked
            ? (since ?? client?.email ?? "On this plan")
            : "Not attached to an active membership"}
        </Text>
      </View>

      {onChat ? (
        <Pressable
          onPress={onChat}
          accessibilityRole="button"
          accessibilityLabel={client ? `Message ${client.name}` : "Message client"}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className={cn(
            "shrink-0 flex-row items-center gap-1.5 rounded-full px-3.5 py-1.75 active:opacity-80",
            tone.chip
          )}
        >
          <Icon name="message-square" size={13} color={tone.icon} />
          <Text className={cn("text-[12.5px] font-semibold", tone.label)}>Chat</Text>
        </Pressable>
      ) : null}

      {onPress ? (
        <Icon name="chevron-right" size={15} color="--muted-foreground" className="opacity-70" />
      ) : null}
    </>
  );

  const className =
    "flex-row items-center gap-2.75 rounded-lg border border-border bg-card px-3.5 py-2.75";

  if (!onPress) return <View className={className}>{body}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={client ? `Open ${client.name}` : undefined}
      className={`${className} active:opacity-90`}
    >
      {body}
    </Pressable>
  );
}

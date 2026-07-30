import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { formatDayLabel, formatMessageTime, isNewDay } from "../format";
import type { Message, SenderType } from "../types";

/** Delivery state for our own bubbles: one tick sent, two ticks read. */
function Ticks({ read }: { read: boolean }) {
  return (
    <View className="flex-row items-center">
      <Icon name="check" size={11} color={read ? "#ffffff" : "#ffffffb3"} />
      {read ? (
        <View className="-ml-1">
          <Icon name="check" size={11} color="#ffffff" />
        </View>
      ) : null}
    </View>
  );
}

function Avatar({ url, className }: { url?: string; className: string }) {
  if (!url) {
    return (
      <View className={cn("items-center justify-center bg-secondary", className)}>
        <Icon name="user" size={14} color="--muted-foreground" />
      </View>
    );
  }
  return <Image source={{ uri: url }} className={className} />;
}

/** The three-dot bubble, shown while the other party is typing. */
function TypingBubble({ avatarUrl }: { avatarUrl?: string }) {
  return (
    <View className="mt-2 flex-row items-end justify-start">
      <Avatar url={avatarUrl} className="mr-2 h-7 w-7 rounded-full" />
      <View className="rounded-3xl rounded-bl-md border border-border/30 bg-card px-4 py-3">
        <View className="flex-row items-center gap-1">
          <View className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
          <View className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
          <View className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
        </View>
      </View>
    </View>
  );
}

interface MessageListProps {
  messages: Message[];
  /** Which senderType is "me". */
  mySide: SenderType;
  /** The other party's avatar, used on their bubbles. */
  avatarUrl?: string;
  otherTyping: boolean;
  onLoadEarlier: () => void;
  hasEarlier: boolean;
  isLoadingEarlier: boolean;
  onRetry: (msg: Message) => void;
}

export function MessageList({
  messages,
  mySide,
  avatarUrl,
  otherTyping,
  onLoadEarlier,
  hasEarlier,
  isLoadingEarlier,
  onRetry,
}: MessageListProps) {
  // The cache holds oldest → newest; an inverted list wants the reverse.
  const rows = useMemo(() => [...messages].reverse(), [messages]);

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      // Inverted, so the chronologically PREVIOUS message is the next row.
      const prev = rows[index + 1];
      const isMe = item.senderType === mySide;
      const grouped = prev?.senderType === item.senderType && !isNewDay(item.createdAt, prev?.createdAt);
      const showDay = isNewDay(item.createdAt, prev?.createdAt);
      const failed = item.status === "failed";

      return (
        <View>
          {showDay && (
            <View className="mx-auto my-2 rounded-full bg-secondary/70 px-3 py-1">
              <Text className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {formatDayLabel(item.createdAt)}
              </Text>
            </View>
          )}
          <View
            className={cn(
              "flex-row items-end",
              isMe ? "justify-end" : "justify-start",
              grouped ? "mt-1" : "mt-2"
            )}
          >
            {!isMe && !grouped ? (
              <Avatar url={avatarUrl} className="mr-2 h-7 w-7 rounded-full" />
            ) : !isMe ? (
              <View className="mr-2 w-7" />
            ) : null}

            <Pressable
              onPress={failed ? () => onRetry(item) : undefined}
              disabled={!failed}
              className={cn(
                "max-w-[78%] px-4 py-2",
                isMe
                  ? "rounded-3xl rounded-br-md bg-primary"
                  : "rounded-3xl rounded-bl-md border border-border/30 bg-card shadow-soft",
                item.status === "sending" && "opacity-60",
                failed && "border border-destructive/60"
              )}
            >
              <Text
                className={cn(
                  "text-[14px] leading-snug",
                  isMe ? "text-primary-foreground" : "text-foreground"
                )}
              >
                {item.body}
              </Text>
              <View className="mt-0.5 flex-row items-center gap-x-1">
                <Text
                  className={cn(
                    "text-[10px]",
                    isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}
                >
                  {failed ? "Failed — tap to retry" : formatMessageTime(item.createdAt)}
                </Text>
                {isMe && !item.status ? <Ticks read={Boolean(item.readAt)} /> : null}
              </View>
            </Pressable>
          </View>
        </View>
      );
    },
    [rows, mySide, avatarUrl, onRetry]
  );

  return (
    <FlatList
      inverted
      data={rows}
      keyExtractor={(m) => m.clientMsgId ?? m.id}
      renderItem={renderItem}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 12 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      onEndReached={hasEarlier ? onLoadEarlier : undefined}
      onEndReachedThreshold={0.4}
      // Inverted: the header sits at the visual bottom, the footer at the top.
      ListHeaderComponent={otherTyping ? <TypingBubble avatarUrl={avatarUrl} /> : null}
      ListFooterComponent={
        isLoadingEarlier ? (
          <View className="items-center py-4">
            <ActivityIndicator />
          </View>
        ) : null
      }
    />
  );
}

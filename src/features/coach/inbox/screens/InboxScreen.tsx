import { useGetConversationsQuery } from "@/api/endpoints/chat.endpoints";
import { clientName, formatThreadTime } from "@/features/shared/messaging/format";
import type { ConversationSummary } from "@/features/shared/messaging/types";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, TextInput, View } from "@/tw";
import { Image } from "@/tw/image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

// Apple Liquid Glass is iOS 26+ only — fall back to a frosted card elsewhere.
const LIQUID_GLASS = isLiquidGlassAvailable();

/** Last-message line — our own replies read "You: …", as in every chat app. */
function preview(c: ConversationSummary): string {
  if (!c.lastMessage) return "No messages yet";
  const prefix = c.lastMessage.senderType === "coach" ? "You: " : "";
  return `${prefix}${c.lastMessage.body}`;
}

export function InboxScreen() {
  const router = useRouter();
  const { tenantId } = useActiveTenant();
  const [search, setSearch] = useState("");

  // Only active/paused relationships get a thread, so this is already the set
  // of clients the coach can actually message.
  const {
    data: conversations,
    isLoading,
    isError,
    refetch,
  } = useGetConversationsQuery({ tenantId: tenantId! }, { skip: !tenantId });

  const threads = useMemo(() => conversations ?? [], [conversations]);

  const filtered = useMemo(
    () =>
      threads.filter((c) =>
        `${clientName(c)} ${preview(c)}`.toLowerCase().includes(search.toLowerCase())
      ),
    [threads, search]
  );

  const totalUnread = useMemo(
    () => threads.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [threads]
  );

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-y-4 pt-5 pb-tabbar"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="px-1">
          <Text className="text-[26px] font-bold tracking-tight text-foreground">Inbox</Text>
          <Text className="text-[13.5px] text-muted-foreground mt-0.5">
            {threads.length} conversation{threads.length !== 1 ? "s" : ""}
            {totalUnread > 0 ? ` · ${totalUnread} unread` : ""}
          </Text>
        </View>

        {/* Search */}
        {(() => {
          const controls = (
            <>
              <Icon name="search" size={16} color="--muted-foreground" />
              <TextInput
                placeholder="Search conversations…"
                placeholderTextColor="#7c7c85"
                value={search}
                onChangeText={setSearch}
                className="flex-1 bg-transparent text-[14px] text-foreground p-0"
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} className="p-1 active:opacity-70">
                  <Icon name="x" size={14} color="--muted-foreground" />
                </Pressable>
              )}
            </>
          );

          return LIQUID_GLASS ? (
            <GlassView
              glassEffectStyle="regular"
              isInteractive
              style={{
                flexDirection: "row",
                alignItems: "center",
                columnGap: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 16,
              }}
            >
              {controls}
            </GlassView>
          ) : (
            <View className="flex-row items-center gap-x-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-soft">
              {controls}
            </View>
          );
        })()}

        {/* Threads — flat list on the app surface */}
        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator />
          </View>
        ) : isError ? (
          <View className="items-center gap-y-3 py-12">
            <Text className="text-[13.5px] text-muted-foreground">
              Couldn&apos;t load your conversations.
            </Text>
            <Pressable
              onPress={() => refetch()}
              className="rounded-full bg-primary px-4 py-2 active:opacity-85"
            >
              <Text className="text-[13px] font-semibold text-primary-foreground">Try again</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-y-1">
            {filtered.map((c) => {
              const unread = c.unreadCount > 0;
              return (
                <Pressable
                  key={c.clientId}
                  onPress={() =>
                    router.push({ pathname: "/(coach)/chat/[id]", params: { id: c.clientId } })
                  }
                  className="flex-row items-center gap-x-3.5 rounded-2xl p-3 active:bg-secondary"
                >
                  {c.client?.avatarUrl ? (
                    <Image
                      source={{ uri: c.client.avatarUrl }}
                      className="h-14 w-14 shrink-0 rounded-full bg-secondary shadow-soft"
                    />
                  ) : (
                    <View className="h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary shadow-soft">
                      <Icon name="user" size={22} color="--muted-foreground" />
                    </View>
                  )}
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-x-2">
                      <Text
                        className={cn(
                          "min-w-0 flex-1 text-[16px] text-foreground",
                          unread ? "font-bold" : "font-semibold"
                        )}
                        numberOfLines={1}
                      >
                        {clientName(c)}
                      </Text>
                      <Text className="shrink-0 text-[11.5px] text-muted-foreground">
                        {formatThreadTime(c.lastMessage?.createdAt)}
                      </Text>
                    </View>
                    <View className="mt-1 flex-row items-center gap-x-2">
                      <Text
                        className={cn(
                          "min-w-0 flex-1 text-[13.5px]",
                          unread ? "font-medium text-foreground" : "text-muted-foreground"
                        )}
                        numberOfLines={1}
                      >
                        {preview(c)}
                      </Text>
                      {unread && (
                        <View className="min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5">
                          <Text className="text-[11px] font-bold text-primary-foreground">
                            {c.unreadCount > 99 ? "99+" : c.unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}

            {threads.length === 0 && (
              <View className="items-center py-12">
                <Text className="text-[13.5px] text-muted-foreground">
                  No conversations yet — chat opens once a client accepts.
                </Text>
              </View>
            )}

            {threads.length > 0 && filtered.length === 0 && (
              <View className="items-center py-12">
                <Text className="text-[13.5px] text-muted-foreground">
                  No conversations match “{search}”.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

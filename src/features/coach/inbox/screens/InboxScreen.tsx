import { clientsList, inboxThreads } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, TextInput, View } from "@/tw";
import { Image } from "@/tw/image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

// Apple Liquid Glass is iOS 26+ only — fall back to a frosted card elsewhere.
const LIQUID_GLASS = isLiquidGlassAvailable();

// Real photo avatars live on the client record; thread ids match client ids.
const avatarFor = (id: string) => clientsList.find((c) => c.id === id)?.avatar;

export function InboxScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      inboxThreads.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const unreadTotal = inboxThreads.reduce((n, t) => n + t.unread, 0);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-y-4 pt-5 pb-30"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="px-1">
          <Text className="text-[26px] font-bold tracking-tight text-foreground">Inbox</Text>
          <Text className="text-[13.5px] text-muted-foreground mt-0.5">
            {unreadTotal} unread across {inboxThreads.length} clients
          </Text>
        </View>

        {/* Search */}
        {(() => {
          const controls = (
            <>
              <Icon name="search" size={16} color="--muted-foreground" />
              <TextInput
                placeholder="Search messages…"
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

        {/* Broadcast */}
        <Pressable className="flex-row items-center gap-x-3 rounded-2xl border border-primary/25 bg-primary/10 px-3.5 py-3 active:opacity-85">
          <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-soft">
            <Icon name="megaphone" size={18} color="--primary-foreground" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[13.5px] font-semibold text-foreground">Broadcast to active clients</Text>
            <Text className="text-[11.5px] text-muted-foreground mt-0.5">One message · 24 active</Text>
          </View>
          <Icon name="chevron-right" size={16} color="--muted-foreground" />
        </Pressable>

        {/* Threads — flat list on the app surface */}
        <View className="gap-y-1">
          {filtered.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => router.push({ pathname: "/(coach)/chat/[id]", params: { id: t.id } })}
              className="flex-row items-center gap-x-3.5 rounded-2xl p-3 active:bg-secondary"
            >
              <Image
                source={{ uri: avatarFor(t.id) }}
                className="h-14 w-14 shrink-0 rounded-full bg-secondary shadow-soft"
              />
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center justify-between gap-x-2">
                  <Text className="flex-1 text-[16px] font-semibold text-foreground" numberOfLines={1}>
                    {t.name}
                  </Text>
                  <Text className="shrink-0 text-[12px] text-muted-foreground">{t.time}</Text>
                </View>
                <View className="flex-row items-center justify-between gap-x-2 mt-1">
                  <Text
                    className={cn(
                      "flex-1 text-[13.5px]",
                      t.unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                    numberOfLines={1}
                  >
                    {t.mine && <Text className="text-muted-foreground">You: </Text>}
                    {t.last}
                  </Text>
                  {t.unread > 0 && (
                    <View className="h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 shadow-soft">
                      <Text className="text-[11px] font-bold text-primary-foreground">{t.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          ))}

          {filtered.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-[13.5px] text-muted-foreground">No conversations match “{search}”.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

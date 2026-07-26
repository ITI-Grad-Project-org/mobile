import { useGetClientsQuery } from "@/api/endpoints/clients.endpoints";
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

type Thread = {
  id: string;
  name: string;
  avatarUrl?: string;
  subtitle: string;
  isActive: boolean;
};

/** Roster rows come back either as a plain client or as a membership wrapping one. */
function toThread(row: any): Thread {
  const c = row.client || row;
  const firstName = c.firstName || row.firstName || "";
  const lastName = c.lastName || row.lastName || "";
  const email = c.email || row.email || "";
  const name =
    `${firstName} ${lastName}`.trim() || c.name || row.name || email || "Client";
  const status = row.status || row.membershipStatus || c.status || "active";

  return {
    id: c.id || row.id || row.membershipId,
    name,
    avatarUrl: c.avatarUrl || row.avatarUrl || row.avatar || undefined,
    subtitle: email || String(status),
    isActive: String(status).toLowerCase() === "active",
  };
}

export function InboxScreen() {
  const router = useRouter();
  const { tenantId } = useActiveTenant();
  const [search, setSearch] = useState("");

  const {
    data: clients,
    isLoading,
    isError,
    refetch,
  } = useGetClientsQuery({ tenantId: tenantId! }, { skip: !tenantId });

  const threads = useMemo(
    () => (clients || []).map(toThread).filter((t) => Boolean(t.id)),
    [clients]
  );

  const filtered = useMemo(
    () =>
      threads.filter((t) =>
        `${t.name} ${t.subtitle}`.toLowerCase().includes(search.toLowerCase())
      ),
    [threads, search]
  );

  const activeCount = threads.filter((t) => t.isActive).length;

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
            {threads.length} client{threads.length !== 1 ? "s" : ""}
            {activeCount > 0 ? ` · ${activeCount} active` : ""}
          </Text>
        </View>

        {/* Search */}
        {(() => {
          const controls = (
            <>
              <Icon name="search" size={16} color="--muted-foreground" />
              <TextInput
                placeholder="Search clients…"
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
            <Text className="text-[11.5px] text-muted-foreground mt-0.5">
              One message · {activeCount} active
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color="--muted-foreground" />
        </Pressable>

        {/* Threads — flat list on the app surface */}
        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator />
          </View>
        ) : isError ? (
          <View className="items-center gap-y-3 py-12">
            <Text className="text-[13.5px] text-muted-foreground">
              Couldn&apos;t load your clients.
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
            {filtered.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => router.push({ pathname: "/(coach)/chat/[id]", params: { id: t.id } })}
                className="flex-row items-center gap-x-3.5 rounded-2xl p-3 active:bg-secondary"
              >
                {t.avatarUrl ? (
                  <Image
                    source={{ uri: t.avatarUrl }}
                    className="h-14 w-14 shrink-0 rounded-full bg-secondary shadow-soft"
                  />
                ) : (
                  <View className="h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary shadow-soft">
                    <Icon name="user" size={22} color="--muted-foreground" />
                  </View>
                )}
                <View className="min-w-0 flex-1">
                  <Text className="text-[16px] font-semibold text-foreground" numberOfLines={1}>
                    {t.name}
                  </Text>
                  <Text className="text-[13.5px] text-muted-foreground mt-1" numberOfLines={1}>
                    {t.subtitle}
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color="--muted-foreground" />
              </Pressable>
            ))}

            {threads.length === 0 && (
              <View className="items-center py-12">
                <Text className="text-[13.5px] text-muted-foreground">
                  No clients yet — invite one to start a conversation.
                </Text>
              </View>
            )}

            {threads.length > 0 && filtered.length === 0 && (
              <View className="items-center py-12">
                <Text className="text-[13.5px] text-muted-foreground">
                  No clients match “{search}”.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

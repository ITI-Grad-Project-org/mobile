import { useGetAttentionQuery } from "@/api/endpoints/analytics.endpoints";
import type { AtRiskClient } from "@/api/types";
import { useClientAvatars } from "@/features/coach/home/hooks/useClientAvatars";
import { useCoachHomeData } from "@/features/coach/home/hooks/useCoachHomeData";
import {
  DEFAULT_RISK_THRESHOLD_DAYS,
  initialsOf,
  pluralise,
  silenceHeadline,
  silenceLength,
} from "@/features/coach/home/lib/format";
import { normalizeAttention } from "@/features/coach/home/lib/normalizeAttention";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Surface } from "@/shared/ui/Surface";
import { Pressable, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { Image } from "@/tw/image";
import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, RefreshControl } from "react-native";

/** Past this many days of silence the row reads as urgent rather than slipping. */
const URGENT_DAYS = 14;

/**
 * The countdown pill. An unknown count says so rather than showing "0 days" —
 * a client only reaches this queue by being silent past the threshold, so a
 * zero here would always be a missing field pretending to be a measurement.
 */
function silenceBadge(client: AtRiskClient): string {
  const length = silenceLength(client.daysSilent);
  if (client.neverActive) return length ? `${length} in` : "Never started";
  return length ? `${length} quiet` : "Quiet";
}

function AtRiskCard({
  client,
  avatarUrl,
  onMessage,
  onOpenCheckins,
}: {
  client: AtRiskClient;
  avatarUrl?: string;
  onMessage: () => void;
  onOpenCheckins?: () => void;
}) {
  // Unknown counts are treated as urgent-adjacent, not calm: the row is on the
  // list either way, and the softer tint would understate it.
  const urgent = client.daysSilent === null || client.daysSilent >= URGENT_DAYS;

  return (
    <Surface
      radius="lg"
      from={urgent ? "--danger-tint" : "--indigo-tint"}
      to="--card"
      angle={140}
      className={cn(
        "gap-3 overflow-hidden p-3.5",
        urgent && "border border-danger/26"
      )}
    >
      <View className="flex-row items-center gap-3">
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="h-10 w-10 shrink-0 overflow-hidden rounded-full object-cover"
          />
        ) : (
          <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
            <Text className="text-[13px] font-semibold text-secondary-foreground">
              {initialsOf(client.clientName)}
            </Text>
          </View>
        )}

        <View className="min-w-0 flex-1">
          <Text
            className="text-[15.5px] font-semibold leading-tight text-foreground"
            numberOfLines={1}
          >
            {client.clientName}
          </Text>
          <Text className="mt-0.5 text-[12.5px] text-muted-foreground" numberOfLines={2}>
            {/* Sentence-cased on the card: the shared helper is worded to sit
                after a name, and here the name is already on the line above. */}
            {silenceHeadline(client).charAt(0).toUpperCase() +
              silenceHeadline(client).slice(1)}
          </Text>
        </View>

        <View
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1",
            urgent ? "bg-danger/12" : "bg-lilac/20"
          )}
        >
          <Text
            className={cn(
              "text-[11.5px] font-semibold",
              urgent ? "text-danger" : "text-lilac-ink"
            )}
          >
            {silenceBadge(client)}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2 pt-0.5">
        {onOpenCheckins ? (
          <Pressable
            onPress={onOpenCheckins}
            className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-secondary active:opacity-80"
          >
            <Icon name="clipboard-list" size={14} color="--foreground" />
            <Text className="text-[13px] font-semibold text-foreground">Check-ins</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onMessage}
          className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-primary active:opacity-90"
        >
          <Icon name="message-square" size={14} color="--primary-foreground" />
          <Text className="text-[13px] font-semibold text-primary-foreground">
            Reach out
          </Text>
        </Pressable>
      </View>
    </Surface>
  );
}

/**
 * Clients who have gone quiet, from /analytics/attention.
 *
 * The drill-down behind Home's "Reach out" row, which used to jump straight
 * into a chat with whoever was worst — that hid the rest of the queue. The
 * list arrives already sorted longest-silence-first and is rendered in that
 * order; the server's ordering is the answer to "who first".
 *
 * Reads the same RTK cache Home populated, so opening this is usually a cache
 * read rather than a request.
 */
export function AtRiskScreen() {
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";
  const { tenantId } = useActiveTenant();
  const avatars = useClientAvatars();
  // /analytics/* speaks in memberships; the chat and check-in routes want the
  // client's USER id, so every deep link goes through this map.
  const { clientUserIds } = useCoachHomeData();

  const attention = useGetAttentionQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );

  // Same tolerant reader Home uses — a queue spelled differently would
  // otherwise render as "nobody has gone quiet", a confident wrong answer.
  const clients = useMemo(
    () => normalizeAttention(attention.data)?.atRisk ?? [],
    [attention.data]
  );

  const openChat = useCallback(
    (membershipId: string) => {
      const userId = clientUserIds.get(membershipId);
      // Without the user id the chat route can't resolve — land on the roster
      // rather than pushing a route that will fail.
      if (userId) {
        router.push({ pathname: "/(coach)/chat/[id]", params: { id: userId } });
        return;
      }
      router.push("/(coach)/(tabs)/clients");
    },
    [clientUserIds]
  );

  const busy = !tenantId || attention.isLoading;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-4 px-5 pt-4 pb-screen"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={attention.isFetching && !busy}
          onRefresh={() => attention.refetch()}
          tintColor={primaryColor}
        />
      }
    >
      <View className="flex-row items-center gap-2">
        <GlassButton
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
        >
          <Icon name="chevron-left" size={20} color="--foreground" />
        </GlassButton>
        <View className="min-w-0 flex-1">
          <Text className="font-display text-[24px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
            Gone quiet
          </Text>
          {!busy ? (
            <Text className="mt-0.5 text-[12.5px] text-muted-foreground">
              {clients.length > 0
                ? `${clients.length} ${pluralise(clients.length, "client")} silent past ${DEFAULT_RISK_THRESHOLD_DAYS} days`
                : `Nobody silent past ${DEFAULT_RISK_THRESHOLD_DAYS} days`}
            </Text>
          ) : null}
        </View>
      </View>

      {busy ? (
        <View className="items-center py-16">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : attention.isError ? (
        <Surface radius="lg" className="items-center gap-3 py-10">
          <Text className="text-sm text-muted-foreground">
            Couldn&apos;t load who has gone quiet.
          </Text>
          <Pressable
            onPress={() => attention.refetch()}
            className="h-11 items-center justify-center rounded-2xl bg-secondary px-6 active:opacity-80"
          >
            <Text className="text-[14px] font-semibold text-foreground">Retry</Text>
          </Pressable>
        </Surface>
      ) : clients.length === 0 ? (
        <Surface radius="lg" className="items-center gap-1 py-10">
          <Text className="text-sm font-semibold text-foreground">
            Nobody has gone quiet
          </Text>
          <Text className="text-xs text-muted-foreground">
            Clients appear here after {DEFAULT_RISK_THRESHOLD_DAYS} days without a log.
          </Text>
        </Surface>
      ) : (
        <View className="gap-3">
          {clients.map((client, i) => {
            const userId = clientUserIds.get(client.membershipId);
            return (
              <AtRiskCard
                // membershipId can be missing on a malformed row, so the index
                // backs the key rather than collapsing rows onto "".
                key={client.membershipId || `row-${i}`}
                client={client}
                avatarUrl={
                  client.membershipId ? avatars.get(client.membershipId) : undefined
                }
                onMessage={() => openChat(client.membershipId)}
                onOpenCheckins={
                  userId
                    ? () =>
                        router.push({
                          pathname: "/(coach)/check-ins/[clientId]",
                          params: { clientId: userId },
                        })
                    : undefined
                }
              />
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

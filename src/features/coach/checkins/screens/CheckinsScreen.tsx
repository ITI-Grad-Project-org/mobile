import { useCoachHomeData } from "@/features/coach/home/hooks/useCoachHomeData";
import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Surface } from "@/shared/ui/Surface";
import { Pressable, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { Image } from "@/tw/image";
import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator } from "react-native";

import { CheckinEntryRow } from "../components/CheckinEntryRow";
import { useRosterMeasurements } from "../hooks/useRosterMeasurements";
import { GlassButton } from "@/shared/ui/GlassButton";

/** Whole history per client, bounded so one long-standing client can't flood it. */
const PER_CLIENT_LIMIT = 50;

/** GlassButton is already a 36px target, so no hitSlop is needed on the back. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "—";
}

/**
 * Every client's check-ins, newest first within each client, oldest kept below.
 *
 * A "check-in" here is a measurement — see useRosterCheckins for why. There is
 * no roster-wide endpoint, so this fans out per client; that is also why the
 * page is capped rather than paged.
 */
export function CheckinsScreen() {
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";
  const { checkinTargets, isLoading: rosterLoading } = useCoachHomeData();

  // No `from`: this screen is the history, so it deliberately drops the
  // 14-day window the Home queue uses.
  const { data, isLoading } = useRosterMeasurements(checkinTargets, {
    enabled: checkinTargets.length > 0,
    limit: PER_CLIENT_LIMIT,
  });

  const { withCheckins, withoutCheckins } = useMemo(() => {
    const has = data.filter((entry) => entry.measurements.length > 0);
    // Most recently active client first — the coach's reading order.
    has.sort((a, b) =>
      b.measurements[0].measuredAt.localeCompare(a.measurements[0].measuredAt)
    );
    return {
      withCheckins: has,
      withoutCheckins: data.filter((entry) => entry.measurements.length === 0),
    };
  }, [data]);

  const busy = rosterLoading || isLoading;
  const total = withCheckins.reduce((sum, entry) => sum + entry.measurements.length, 0);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-4 px-5 pt-4 pb-30"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center gap-2">
        <GlassButton
          onPress={() => router.back()}
          // hitSlop={HIT_SLOP}
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
        >
          <Icon name="chevron-left" size={20} color="--foreground" />
        </GlassButton>
        <View className="min-w-0 flex-1">
          <Text className="font-display text-[24px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
            Check-ins
          </Text>
          {!busy && total > 0 ? (
            <Text className="mt-0.5 text-[12.5px] text-muted-foreground">
              {total} across {withCheckins.length}{" "}
              {withCheckins.length === 1 ? "client" : "clients"}
            </Text>
          ) : null}
        </View>
      </View>

      {busy ? (
        <View className="items-center py-16">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : withCheckins.length === 0 && withoutCheckins.length === 0 ? (
        <Surface radius="lg" className="items-center gap-1 py-10">
          <Text className="text-sm font-semibold text-foreground">No clients yet</Text>
          <Text className="text-xs text-muted-foreground">
            Check-ins appear once a client logs measurements.
          </Text>
        </Surface>
      ) : (
        <>
          {withCheckins.map(({ client, measurements }) => (
            <Surface key={client.clientId} radius="lg">
              <Pressable
                onPress={() =>
                  // The detail screen needs BOTH ids: measurements are keyed by
                  // the client's user id, the strength series by membershipId.
                  router.push({
                    pathname: "/(coach)/check-ins/[clientId]",
                    params: {
                      clientId: client.clientId,
                      membershipId: client.membershipId,
                      name: client.name,
                      avatarUrl: client.avatarUrl,
                    },
                  })
                }
                className="flex-row items-center gap-3 px-3.5 py-3.5 active:opacity-80"
              >
                {client.avatarUrl ? (
                  <Image
                    source={{ uri: client.avatarUrl }}
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Text className="text-[12px] font-semibold text-secondary-foreground">
                      {initialsOf(client.name)}
                    </Text>
                  </View>
                )}
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
                    {client.name}
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-muted-foreground">
                    {measurements.length}{" "}
                    {measurements.length === 1 ? "check-in" : "check-ins"}
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color="--muted-foreground" />
              </Pressable>

              {/* Newest first, with every older one kept below it — each row's
                  delta is against the check-in directly beneath. */}
              {measurements.map((entry, i) => (
                <CheckinEntryRow
                  key={entry.id ?? `${client.clientId}-${entry.measuredAt}-${i}`}
                  entry={entry}
                  previous={measurements[i + 1]}
                  latest={i === 0}
                  divided
                />
              ))}
            </Surface>
          ))}

          {withoutCheckins.length > 0 ? (
            <View className="gap-2 px-0.5">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                No check-ins yet
              </Text>
              {withoutCheckins.map(({ client }) => (
                <Text
                  key={client.clientId}
                  className={cn("text-[12.5px] text-muted-foreground")}
                  numberOfLines={1}
                >
                  {client.name}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

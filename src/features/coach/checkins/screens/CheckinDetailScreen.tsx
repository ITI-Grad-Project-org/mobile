import { useGetClientProgressQuery } from "@/api/endpoints/analytics.endpoints";
import { useListClientMeasurementsQuery } from "@/api/endpoints/measurements.endpoints";
import {
  deriveMeasurementStats,
  formatDelta,
  formatShortDate,
} from "@/features/shared/measurements/stats";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Card } from "@/shared/ui/Card";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { MetricGrid } from "@/shared/ui/MetricGrid";
import { Surface } from "@/shared/ui/Surface";
import WeightChart from "@/shared/ui/WeightChart";
import { Pressable, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { Image } from "@/tw/image";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator } from "react-native";

import { CheckinEntryRow } from "../components/CheckinEntryRow";
import { StrengthProgressCard } from "../components/StrengthProgressCard";
import { useCheckinReviews } from "../hooks/useCheckinReviews";
import { sfx } from "@/lib/sfx";

/** Whole history for one client — a single client can't flood one screen. */
const HISTORY_LIMIT = 50;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "—";
}

/**
 * One client's check-ins and progress, coach-side.
 *
 * The coach mirror of the client's Progress screen, with the ownership
 * inverted: read-only (no logging, no edit sheet) and reached by tapping a
 * client on Check-ins.
 *
 * Two data sources, deliberately: measurements come from
 * /client/{clientId}/measurements, which speaks the client's USER id, while the
 * strength series comes from /analytics/clients/{membershipId}/progress, which
 * speaks the MEMBERSHIP id. Passing either id to the other route 404s, so both
 * arrive as params rather than being derived here.
 */
export function CheckinDetailScreen() {
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";
  const { tenantId } = useActiveTenant();
  const { clientId, membershipId, name, avatarUrl } = useLocalSearchParams<{
    clientId: string;
    membershipId?: string;
    name?: string;
    avatarUrl?: string;
  }>();

  const measurements = useListClientMeasurementsQuery(
    { clientId: clientId ?? "", tenantId: tenantId ?? "", limit: HISTORY_LIMIT },
    { skip: !clientId || !tenantId }
  );

  // Strength only — the measurements above are the richer source for body
  // metrics (they carry photos and every field), so analytics is not read twice.
  const progress = useGetClientProgressQuery(
    { membershipId: membershipId ?? "", tenantId: tenantId ?? "" },
    { skip: !membershipId || !tenantId }
  );

  const stats = useMemo(
    () => deriveMeasurementStats(measurements.data),
    [measurements.data]
  );

  // Newest first for reading; the series itself stays oldest → newest so the
  // chart and the deltas keep their direction.
  const history = useMemo(() => [...stats.series].reverse(), [stats.series]);

  const chart = useMemo(() => {
    if (stats.weightSeries.length < 2) return null;
    const min = Math.min(...stats.weightSeries);
    const max = Math.max(...stats.weightSeries);
    // A flat series has no range to scale against; give it one so the line
    // renders through the middle instead of dividing by zero.
    return { min, range: max - min || 1 };
  }, [stats.weightSeries]);

  const weight = stats.metrics.find((metric) => metric.key === "weightKg");
  const weightGood = weight?.delta !== undefined && weight.delta < 0;
  const busy = measurements.isLoading;

  // Reviewing from here means "I've read this client's history" — the same
  // per-measurement write the list screen makes, over every unread entry on
  // this screen rather than just the newest, since they are all in front of the
  // coach. Server state, and one-way: there is no un-review route.
  const reviews = useCheckinReviews();
  const unreviewed = useMemo(
    () => history.filter((entry) => !reviews.isReviewed(entry)),
    [history, reviews]
  );
  const reviewed = stats.hasData && unreviewed.length === 0;

  const markReviewed = async () => {
    if (!clientId || unreviewed.length === 0) return;
    const result = await reviews.markReviewed(
      unreviewed.map((entry) => entry.id),
      { clientId }
    );
    if (result.reviewed > 0) sfx.success();
    return result;
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-y-4 px-5 pt-4 pb-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-2">
          <GlassButton
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
          >
            <Icon name="chevron-left" size={20} color="--foreground" />
          </GlassButton>

          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className="h-9 w-9 shrink-0 overflow-hidden rounded-full object-cover"
            />
          ) : (
            <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
              <Text className="text-[12px] font-semibold text-secondary-foreground">
                {initialsOf(name ?? "")}
              </Text>
            </View>
          )}

          <View className="min-w-0 flex-1">
            <Text
              className="font-display text-[20px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground"
              numberOfLines={1}
            >
              {name || "Client"}
            </Text>
            {!busy && stats.hasData ? (
              <Text className="mt-0.5 text-[12.5px] text-muted-foreground">
                {stats.series.length} check-{stats.series.length === 1 ? "in" : "ins"}
                {stats.latest ? ` · last ${formatShortDate(stats.latest.measuredAt)}` : ""}
              </Text>
            ) : null}
          </View>

          {clientId ? (
            <GlassButton
              onPress={() =>
                router.push({ pathname: "/(coach)/chat/[id]", params: { id: clientId } })
              }
              className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            >
              <Icon name="message-square" size={18} color="--foreground" />
            </GlassButton>
          ) : null}
        </View>

        {busy ? (
          <View className="items-center py-16">
            <ActivityIndicator color={primaryColor} />
          </View>
        ) : !stats.hasData ? (
          <Surface radius="lg" className="items-center gap-1 py-10">
            <Text className="text-sm font-semibold text-foreground">No check-ins yet</Text>
            <Text className="text-xs text-muted-foreground">
              This client hasn&apos;t logged any measurements.
            </Text>
          </Surface>
        ) : (
          <>
            {/* Weight — the headline metric, with the trend behind it. Same
                `Card glass` treatment as the client's Progress screen, so the
                chart reads identically on both sides. */}
            <Card glass>
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Weight
                  </Text>
                  <View className="mt-1 flex-row items-baseline gap-2">
                    <Text className="text-4xl font-black text-foreground">
                      {weight?.value ?? "—"}
                    </Text>
                    <Text className="text-base font-medium text-muted-foreground">kg</Text>
                  </View>
                </View>
                {weight?.delta !== undefined && weight.delta !== 0 ? (
                  <View
                    className={cn(
                      "flex-row items-center gap-1 rounded-full px-2.5 py-1",
                      weightGood ? "bg-mint" : "bg-peach"
                    )}
                  >
                    <Icon
                      name={weight.delta < 0 ? "trending-down" : "trending-up"}
                      size={14}
                      color={weightGood ? "--mint-ink" : "--peach-ink"}
                    />
                    <Text
                      className={cn(
                        "text-[12px] font-semibold",
                        weightGood ? "text-mint-ink" : "text-peach-ink"
                      )}
                    >
                      {formatDelta(weight.delta)} kg
                    </Text>
                  </View>
                ) : null}
              </View>

              {chart ? (
                <View className="mt-4 h-32 w-full">
                  <WeightChart
                    weightData={stats.weightSeries}
                    min={chart.min}
                    range={chart.range}
                    primaryColor={primaryColor}
                  />
                  <View className="mt-1 flex-row justify-between">
                    <Text className="text-[10px] font-medium text-muted-foreground">
                      {formatShortDate(stats.series[0].measuredAt)}
                    </Text>
                    <Text className="text-[10px] font-medium text-muted-foreground">
                      {formatShortDate(stats.series[stats.series.length - 1].measuredAt)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </Card>

            {/* The same four body metrics the client sees on their own Progress
                screen, read the same way — so coach and client are never looking
                at differently-derived numbers for the same check-in. */}
            <MetricGrid metrics={stats.metrics} />

            {/* Strength is analytics-side and keyed by membershipId, so it can be
                absent on a row that only carried a client id. */}
            {membershipId && !progress.isLoading ? (
              <StrengthProgressCard strength={progress.data?.strength ?? []} />
            ) : null}

            {/* Photos on the latest check-in, when the client attached any. */}
            {stats.latestPhotos.length > 0 ? (
              <Surface radius="lg" className="gap-3 p-3.75">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Latest photos
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {stats.latestPhotos.map((uri) => (
                      <Image
                        key={uri}
                        source={{ uri }}
                        className="h-40 w-28 overflow-hidden rounded-xl object-cover"
                      />
                    ))}
                  </View>
                </ScrollView>
              </Surface>
            ) : null}

            {/* Full history, newest first. Each row carries the one before it so
                the deltas read as "since last check-in". */}
            <Surface radius="lg">
              <View className="px-3.5 pt-3.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  History
                </Text>
              </View>
              {history.map((entry, i) => (
                <CheckinEntryRow
                  key={entry.id}
                  entry={entry}
                  previous={history[i + 1]}
                  latest={i === 0}
                  divided={i > 0}
                />
              ))}
            </Surface>
          </>
        )}
      </ScrollView>

      {/* Outside the ScrollView so the decision is always one tap away — this
          screen is long, and the coach reaches it from a review queue. */}
      {!busy && stats.hasData ? (
        <View className="border-t border-border bg-background px-5 pb-8 pt-3">
          {/* No "mark unread" counterpart: the API has no un-review route. */}
          {reviewed ? (
            <View className="flex-row items-center justify-center gap-2 py-1.5">
              <Icon name="check" size={15} color="--success" />
              <Text className="text-[13.5px] font-semibold text-success">Reviewed</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-2.5">
              {/* Awaited before leaving: the write is what the next screen
                  reads its queue from, so navigating first would send the coach
                  back to a list that still shows this client as unread. */}
              <Pressable
                onPress={async () => {
                  await markReviewed();
                  router.back();
                }}
                disabled={reviews.isMarking}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 active:opacity-85 disabled:opacity-50"
              >
                <Icon name="check" size={16} color="--primary-foreground" />
                <Text className="text-[14px] font-semibold text-primary-foreground">
                  Mark reviewed
                </Text>
              </Pressable>

              {/* Reviewing is silent to the client — the coachFeedback the
                  review route accepts isn't collected here — so a reply is
                  still what closes the loop for them. */}
              <Pressable
                onPress={async () => {
                  await markReviewed();
                  router.push({
                    pathname: "/(coach)/chat/[id]",
                    params: { id: clientId },
                  });
                }}
                disabled={reviews.isMarking}
                className="flex-row items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3.5 active:opacity-70 disabled:opacity-50"
              >
                <Icon name="message-square" size={16} color="--foreground" />
                <Text className="text-[14px] font-semibold text-foreground">Reply</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

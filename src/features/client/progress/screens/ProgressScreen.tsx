import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, RefreshControl } from "react-native";

import { useListMeasurementsQuery } from "@/api/endpoints/measurements.endpoints";
import type { Measurement } from "@/api/types";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { MetricGrid } from "@/shared/ui/MetricGrid";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Image } from "@/tw/image";
import { Pressable, ScrollView, Text, useCSSVariable, View } from "@/tw";
import { MeasurementActionsSheet } from "../components/MeasurementActionsSheet";
import WeightChart from "@/shared/ui/WeightChart";
import {
  deriveMeasurementStats,
  formatDelta,
  formatShortDate,
  MEASUREMENT_HISTORY_LIMIT,
} from "../lib/measurements";

const openForm = () => router.push("/(client)/measurement");

/** Small "+ Add" pill used in the header. */
function AddButton() {
  return (
    <Pressable
      onPress={openForm}
      className="flex-row items-center gap-1 rounded-full bg-primary px-3 py-1.5 shadow-soft active:opacity-90"
    >
      <Icon name="plus" size={14} color="--primary-foreground" />
      <Text className="text-[12px] font-semibold text-primary-foreground">Add</Text>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <Card glass className="items-center gap-3 py-8">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <Icon name="ruler" size={24} color="--muted-foreground" />
      </View>
      <View className="items-center gap-1">
        <Text className="text-[16px] font-bold text-foreground">No measurements yet</Text>
        <Text className="max-w-xs text-center text-[13px] text-muted-foreground">
          Log your weight and body measurements to see your progress chart build up over time.
        </Text>
      </View>
      <Pressable
        onPress={openForm}
        className="mt-1 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary px-6 shadow-soft active:opacity-90"
      >
        <Icon name="plus" size={16} color="--primary-foreground" />
        <Text className="text-[14px] font-semibold text-primary-foreground">
          Log your first measurement
        </Text>
      </Pressable>
    </Card>
  );
}

/**
 * Shown when the client has no active membership yet — a fresh sign-up, or an
 * invitation still pending.
 *
 * Measurements live inside a coaching relationship: /client/me/measurements
 * answers 400 ("Client has no active tenant selected") or 404 ("Active client
 * membership not found") in that state, and POST rejects the same way. So this
 * deliberately does NOT offer "Log your first measurement" — that button would
 * fail with the very error this state replaces.
 */
function NoMembershipState() {
  return (
    <Card glass className="items-center gap-3 py-8">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <Icon name="ruler" size={24} color="--muted-foreground" />
      </View>
      <View className="items-center gap-1">
        <Text className="text-[16px] font-bold text-foreground">Nothing to track yet</Text>
        <Text className="max-w-xs text-center text-[13px] text-muted-foreground">
          Join a coach to start logging your weight and body measurements.
        </Text>
      </View>
      <Pressable
        onPress={() => router.push("/(setup)/match-coach")}
        className="mt-1 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary px-6 shadow-soft active:opacity-90"
      >
        <Icon name="user-plus" size={16} color="--primary-foreground" />
        <Text className="text-[14px] font-semibold text-primary-foreground">Find a coach</Text>
      </Pressable>
    </Card>
  );
}

export function ProgressScreen() {
  const { tenantId } = useActiveTenant();
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";
  const [selected, setSelected] = useState<Measurement | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useListMeasurementsQuery(
      { tenantId: tenantId ?? "", limit: MEASUREMENT_HISTORY_LIMIT },
      { skip: !tenantId }
    );

  // No active membership is not a failed request. The endpoint answers 400
  // ("Client has no active tenant selected") or 404 ("Active client membership
  // not found") for a client who hasn't joined a coach — and with no tenant at
  // all the query is skipped, which lands here too. Rendering any of these as
  // "Couldn't load your measurements" tells a new client something broke when
  // nothing did.
  const status = (error as FetchBaseQueryError | undefined)?.status;
  const noMembership = !tenantId || status === 400 || status === 404;

  const stats = deriveMeasurementStats(data);
  const weight = stats.metrics.find((m) => m.key === "weightKg");
  const weightGood = weight?.delta !== undefined && weight.delta < 0;

  const chart =
    stats.weightSeries.length >= 2
      ? (() => {
          const max = Math.max(...stats.weightSeries);
          const min = Math.min(...stats.weightSeries);
          return { min, range: max - min || 1 };
        })()
      : null;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-5 pt-5 pb-tabbar"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          // Never during the first load — the spinner below owns that.
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          tintColor={primaryColor}
        />
      }
    >
      <View className="flex-row items-start justify-between px-1">
        <View className="min-w-0 flex-1">
          <Text className="text-[26px] font-bold tracking-tight text-foreground">Progress</Text>
          <Text className="mt-0.5 text-[13.5px] text-muted-foreground">Proof of work.</Text>
        </View>
        {stats.hasData ? <AddButton /> : null}
      </View>

      {isLoading ? (
        <View className="items-center py-16">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : noMembership ? (
        <NoMembershipState />
      ) : isError ? (
        <Card glass className="items-center gap-3 py-8">
          <Text className="text-[14px] text-muted-foreground">
            Couldn&apos;t load your measurements.
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="h-11 items-center justify-center rounded-2xl bg-secondary px-6 active:opacity-80"
          >
            <Text className="text-[14px] font-semibold text-foreground">Retry</Text>
          </Pressable>
        </Card>
      ) : !stats.hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Weight chart */}
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
                  className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${
                    weightGood ? "bg-mint" : "bg-peach"
                  }`}
                >
                  <Icon
                    name={weight.delta < 0 ? "trending-down" : "trending-up"}
                    size={14}
                    color={weightGood ? "--mint-ink" : "--peach-ink"}
                  />
                  <Text
                    className={`text-[12px] font-semibold ${
                      weightGood ? "text-mint-ink" : "text-peach-ink"
                    }`}
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
            ) : (
              <Text className="mt-4 text-[12px] text-muted-foreground">
                Log one more measurement to see your trend.
              </Text>
            )}
          </Card>

          {/* Metric grid — shared with the coach's check-in detail screen. */}
          <MetricGrid metrics={stats.metrics} />

          {/* Progress photos */}
          {stats.latestPhotos.length > 0 ? (
            <View>
              <SectionTitle
                title="Latest photos"
                action={
                  <Text className="text-[12px] text-muted-foreground">
                    {formatShortDate(stats.latest!.measuredAt)}
                  </Text>
                }
              />
              <View className="flex-row gap-2">
                {stats.latestPhotos.slice(0, 3).map((uri, i) => (
                  <View
                    key={`${uri}-${i}`}
                    className="aspect-3/4 flex-1 overflow-hidden rounded-2xl bg-secondary shadow-soft"
                  >
                    <Image source={{ uri }} className="h-full w-full" contentFit="cover" />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Check-in history */}
          <View>
            <SectionTitle title="Check-in history" />
            <Card className="p-2" glass>
              {[...stats.series]
                .reverse()
                .slice(0, 8)
                .map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => setSelected(m)}
                    className="flex-row items-center gap-3 rounded-2xl p-3 active:opacity-70"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-mint">
                      <Text className="text-[11px] font-bold text-mint-ink">
                        {formatShortDate(m.measuredAt).split(" ")[1]}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-[13.5px] font-semibold text-foreground">
                        {formatShortDate(m.measuredAt)}
                        {m.weightKg !== undefined ? ` · ${m.weightKg} kg` : ""}
                      </Text>
                      <Text className="mt-0.5 text-[12px] text-muted-foreground" numberOfLines={1}>
                        {[
                          m.bodyFatPct !== undefined ? `${m.bodyFatPct}% bf` : null,
                          m.waistCm !== undefined ? `${m.waistCm}cm waist` : null,
                          m.photos?.length ? `${m.photos.length} photo${m.photos.length > 1 ? "s" : ""}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Logged"}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={16} color="--muted-foreground" />
                  </Pressable>
                ))}
            </Card>
          </View>
        </>
      )}

      <MeasurementActionsSheet measurement={selected} onClose={() => setSelected(null)} />
    </ScrollView>
  );
}

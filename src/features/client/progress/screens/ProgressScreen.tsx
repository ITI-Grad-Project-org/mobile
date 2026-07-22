import { router } from "expo-router";
import React from "react";
import { ActivityIndicator } from "react-native";

import { useListMeasurementsQuery } from "@/api/endpoints/measurements.endpoints";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Image } from "@/tw/image";
import { Pressable, ScrollView, Text, useCSSVariable, View } from "@/tw";
import WeightChart from "../components/WeightChart";
import {
  deriveMeasurementStats,
  formatDelta,
  formatShortDate,
  type MetricSummary,
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

type GridTone = "ink" | "lilac" | "sun" | "peach";

// Literal class names per tone so NativeWind keeps them at build time.
const TONE_INK: Record<GridTone, string> = {
  ink: "text-ink-foreground",
  lilac: "text-lilac-ink",
  sun: "text-sun-ink",
  peach: "text-peach-ink",
};

/** A single toned metric tile in the grid. */
function MetricCard({ metric, tone }: { metric: MetricSummary; tone: GridTone }) {
  const hasValue = metric.value !== undefined;
  const inkClass = TONE_INK[tone];
  const goodDelta =
    metric.delta !== undefined &&
    metric.delta !== 0 &&
    (metric.lowerIsBetter ? metric.delta < 0 : metric.delta > 0);

  return (
    <Card tone={tone} className="flex-1" glass>
      <Text className={`text-[11px] font-semibold uppercase tracking-wider opacity-70 ${inkClass}`}>
        {metric.label}
      </Text>
      <Text className={`mt-1 text-2xl font-black ${inkClass}`}>
        {hasValue ? `${metric.value} ${metric.unit}` : "—"}
      </Text>
      {metric.delta !== undefined && metric.delta !== 0 ? (
        <Text
          className={`mt-1 text-[11px] ${goodDelta ? "text-success" : `opacity-80 ${inkClass}`}`}
        >
          {formatDelta(metric.delta)} {metric.unit}
        </Text>
      ) : null}
    </Card>
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

export function ProgressScreen() {
  const { tenantId } = useActiveTenant();
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";

  const { data, isLoading, isError, refetch } = useListMeasurementsQuery(
    { tenantId: tenantId ?? "", limit: 100 },
    { skip: !tenantId }
  );

  const stats = deriveMeasurementStats(data);
  const weight = stats.metrics.find((m) => m.key === "weightKg");
  const weightGood = weight?.delta !== undefined && weight.delta < 0;

  // Curated grid: four toned tiles. Weight leads the headline card above, so the
  // grid surfaces the next most useful metrics.
  const gridKeys: MetricSummary["key"][] = ["waistCm", "bodyFatPct", "chestCm", "thighCm"];
  const gridTones: GridTone[] = ["ink", "lilac", "sun", "peach"];
  const gridMetrics = gridKeys.map((k) => stats.metrics.find((m) => m.key === k)!);

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
      contentContainerClassName="gap-y-5 pt-5 pb-30"
      showsVerticalScrollIndicator={false}
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

          {/* Metric grid */}
          <View className="gap-3">
            <View className="flex-row gap-3">
              <MetricCard metric={gridMetrics[0]} tone={gridTones[0]} />
              <MetricCard metric={gridMetrics[1]} tone={gridTones[1]} />
            </View>
            <View className="flex-row gap-3">
              <MetricCard metric={gridMetrics[2]} tone={gridTones[2]} />
              <MetricCard metric={gridMetrics[3]} tone={gridTones[3]} />
            </View>
          </View>

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
                  <View
                    key={m.id}
                    className="flex-row items-center gap-3 rounded-2xl p-3"
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
                  </View>
                ))}
            </Card>
          </View>
        </>
      )}
    </ScrollView>
  );
}

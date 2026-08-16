import { router } from "expo-router";
import React from "react";

import { useListMeasurementsQuery } from "@/api/endpoints/measurements.endpoints";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Pressable, Text, useCSSVariable, View } from "@/tw";
import WeightChart from "@/shared/ui/WeightChart";
import { deriveMeasurementStats, formatDelta } from "../lib/measurements";

const openForm = () => router.push("/(client)/measurement");
const openProgress = () => router.push("/(client)/(tabs)/progress");

export function MeasurementsSummaryCard() {
  const { tenantId } = useActiveTenant();
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";

  const { data } = useListMeasurementsQuery(
    { tenantId: tenantId ?? "", limit: 100 },
    { skip: !tenantId }
  );

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
    <Card glass>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-secondary">
            <Icon name="ruler" size={16} color="--muted-foreground" />
          </View>
          <View>
            <Text className="text-[15px] font-bold text-foreground">Body measurements</Text>
            <Text className="text-[12.5px] text-muted-foreground">Track your progress anytime</Text>
          </View>
        </View>
        {stats.hasData ? (
          <Pressable onPress={openProgress} className="active:opacity-70">
            <Text className="text-[12px] font-semibold text-primary">View all</Text>
          </Pressable>
        ) : null}
      </View>

      {stats.hasData ? (
        <>
          <View className="mt-4 flex-row items-end justify-between">
            <View>
              <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Latest weight
              </Text>
              <View className="mt-1 flex-row items-baseline gap-1.5">
                <Text className="text-3xl font-black text-foreground">
                  {weight?.value ?? "—"}
                </Text>
                <Text className="text-[14px] font-medium text-muted-foreground">kg</Text>
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
                  size={13}
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
            <View className="mt-3 h-20 w-full">
              <WeightChart
                weightData={stats.weightSeries}
                min={chart.min}
                range={chart.range}
                primaryColor={primaryColor}
              />
            </View>
          ) : null}

          <Pressable
            onPress={openForm}
            className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90"
          >
            <Icon name="plus" size={16} color="--primary-foreground" />
            <Text className="text-[14px] font-semibold text-primary-foreground">
              Add measurement
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text className="mt-3 text-[13px] text-muted-foreground">
            Log your weight and body measurements to see your trend build over time.
          </Text>
          <Pressable
            onPress={openForm}
            className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90"
          >
            <Icon name="plus" size={16} color="--primary-foreground" />
            <Text className="text-[14px] font-semibold text-primary-foreground">
              Log your first measurement
            </Text>
          </Pressable>
        </>
      )}
    </Card>
  );
}

import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { ScrollView, Text, useCSSVariable, View } from "@/tw";
import React from "react";
import WeightChart from "../components/WeightChart";

const weightData = [82.4, 82.1, 81.8, 81.5, 81.7, 81.2, 80.8, 80.5, 80.6, 80.2, 79.9, 79.5];

export function ClientProgressScreen() {
  const max = Math.max(...weightData);
  const min = Math.min(...weightData);
  const range = max - min || 1;
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-5 pt-5 pb-30"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-1">
        <Text className="text-[26px] font-bold tracking-tight text-foreground">Progress</Text>
        <Text className="text-[13.5px] text-muted-foreground mt-0.5">12 weeks in. Proof of work.</Text>
      </View>

      {/* Weight chart */}
      <Card glass>
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Weight
            </Text>
            <View className="mt-1 flex-row items-baseline gap-2">
              <Text className="text-4xl font-black text-foreground">79.5</Text>
              <Text className="text-base font-medium text-muted-foreground">kg</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1 rounded-full bg-mint px-2.5 py-1">
            <Icon name="trending-down" size={14} color="--mint-ink" />
            <Text className="text-[12px] font-semibold text-mint-ink">−2.9 kg</Text>
          </View>
        </View>

        {/* svg line chart */}
        <View className="mt-4 h-32 w-full">
          <WeightChart
            weightData={weightData}
            min={min}
            range={range}
            primaryColor={primaryColor}
          />
          <View className="mt-1 flex-row justify-between">
            <Text className="text-[10px] font-medium text-muted-foreground">Apr</Text>
            <Text className="text-[10px] font-medium text-muted-foreground">May</Text>
            <Text className="text-[10px] font-medium text-muted-foreground">Jun</Text>
          </View>
        </View>
      </Card>

      {/* metric grid */}
      <View className="gap-3">
        <View className="flex-row gap-3">
          <Card tone="ink" className="flex-1" glass>
            <Icon name="ruler" size={20} color="--ink-foreground" className="opacity-80" />
            <Text className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-foreground/60">
              Waist
            </Text>
            <Text className="text-2xl font-black text-ink-foreground">82 cm</Text>
            <Text className="text-[11px] text-mint mt-1">−4 cm this block</Text>
          </Card>
          
          <Card tone="sun" className="flex-1" glass>
            <Icon name="trophy" size={20} color="--sun-ink" className="opacity-80" />
            <Text className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-sun-ink opacity-70">
              Squat PR
            </Text>
            <Text className="text-2xl font-black text-sun-ink">120 kg</Text>
            <Text className="text-[11px] text-sun-ink opacity-80 mt-1">+10 kg in 6 wks</Text>
          </Card>
        </View>

        <View className="flex-row gap-3">
          <Card tone="lilac" className="flex-1" glass>
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-lilac-ink opacity-70">
              Body fat
            </Text>
            <Text className="mt-1 text-2xl font-black text-lilac-ink">18.4%</Text>
            <View className="mt-2.5 h-1.5 rounded-full bg-lilac-ink/15 overflow-hidden">
              <View className="h-full w-[65%] rounded-full bg-lilac-ink" />
            </View>
          </Card>

          <Card tone="peach" className="flex-1" glass>
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-peach-ink opacity-70">
              Workouts
            </Text>
            <Text className="mt-1 text-2xl font-black text-peach-ink">38/48</Text>
            <Text className="text-[11px] text-peach-ink opacity-80 mt-1">79% adherence</Text>
          </Card>
        </View>
      </View>

      {/* Progress photos */}
      <View>
        <SectionTitle
          title="Progress photos"
          action={<Icon name="camera" size={16} color="--muted-foreground" className="opacity-80" />}
        />
        <View className="flex-row gap-2">
          {["Apr 1", "May 1", "Jun 1"].map((d) => (
            <View
              key={d}
              className="flex-1 aspect-3/4 overflow-hidden rounded-2xl bg-secondary justify-center items-center shadow-soft"
            >
              <Text className="text-3xl opacity-40">📸</Text>
              <View className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-white">{d}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Check-in history */}
      <View>
        <SectionTitle title="Check-in history" />
        <Card className="p-2" glass>
          {[
            { d: "Jun 20", w: "79.9", note: "Sleep improved, energy 8/10" },
            { d: "Jun 13", w: "80.2", note: "Tough week, missed 1 session" },
            { d: "Jun 6", w: "80.6", note: "On plan, photos uploaded" },
          ].map((c, i, arr) => (
            <View
              key={c.d}
              className={cn(
                "flex-row items-center gap-3 rounded-2xl p-3",
              )}
            >
              <View className="h-10 w-10 justify-center items-center rounded-xl bg-mint">
                <Text className="text-mint-ink text-[11px] font-bold">
                  {c.d.split(" ")[1]}
                </Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-[13.5px] font-semibold text-foreground">
                  {c.d} · {c.w} kg
                </Text>
                <Text className="text-[12px] text-muted-foreground mt-0.5" numberOfLines={1}>
                  {c.note}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

import { useActiveCoach } from "@/lib/role";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { useMemo, useState } from "react";
import { DayCard } from "../components/DayCard";
import { DaySheet } from "../components/DaySheet";
import { NutritionTab } from "../components/NutritionTab";
import { PlanSegmented, type PlanSub } from "../components/PlanSegmented";
import { PLAN_HEADER, buildWeek, type DayPlan } from "../data";

const TOTAL_WEEKS = 6;

export function ClientPlanScreen() {
  const coach = useActiveCoach();
  const week = useMemo(() => buildWeek(coach.planType), [coach.planType]);
  const header = PLAN_HEADER[coach.planType] ?? PLAN_HEADER.strength;

  const [sub, setSub] = useState<PlanSub>("training");
  const [weekNum, setWeekNum] = useState(1);
  const [openDay, setOpenDay] = useState<DayPlan | null>(null);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-5 pt-5 pb-30"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-1">
        <Text className="text-[26px] font-bold tracking-tight text-foreground">
          {header.title}
        </Text>
        <Text className="text-[13.5px] text-muted-foreground">
          {header.subtitle} · with {coach.name.split(" ")[0]}
        </Text>
      </View>

      {/* Training / Nutrition toggle */}
      <PlanSegmented value={sub} onChange={setSub} />

      {/* Week pager */}
      <Card className="flex-row items-center justify-between" glass>
        <Pressable
          onPress={() => setWeekNum((w) => Math.max(1, w - 1))}
          className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-80"
          accessibilityLabel="Previous week"
        >
          <Icon name="chevron-left" size={16} color="--foreground" />
        </Pressable>
        <View className="items-center">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Block A
          </Text>
          <Text className="text-[16px] font-bold text-foreground">
            Week {weekNum} of {TOTAL_WEEKS}
          </Text>
        </View>
        <Pressable
          onPress={() => setWeekNum((w) => Math.min(TOTAL_WEEKS, w + 1))}
          className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-80"
          accessibilityLabel="Next week"
        >
          <Icon name="chevron-right" size={16} color="--foreground" />
        </Pressable>
      </Card>

      {/* Content */}
      {sub === "training" ? (
        <View className="gap-y-4">
          {week.map((day) => (
            <DayCard key={day.d} day={day} onPress={() => setOpenDay(day)} />
          ))}
        </View>
      ) : (
        <NutritionTab />
      )}

      {/* Day detail sheet */}
      <DaySheet day={openDay} onClose={() => setOpenDay(null)} />
    </ScrollView>
  );
}

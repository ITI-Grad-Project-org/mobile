import {
  enduranceExercises,
  exercises as strengthExercises,
  yogaExercises,
  type Exercise,
} from "@/lib/data";
import { useActiveCoach, useRole } from "@/lib/role";
import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { useMemo, useState } from "react";
import { ExerciseSheet } from "../components/ExerciseSheet";
import { StreakHero } from "../components/StreakGrid";
import { WorkoutCard } from "../components/WorkoutCard";

const PLAN_META: Record<
  string,
  {
    title: string;
    subtitle: string;
    tone: "mint" | "lilac" | "sky" | "peach";
    mins: number;
  }
> = {
  strength: {
    title: "Quad-focused strength",
    subtitle: "DAY 4 · LOWER BODY",
    tone: "mint",
    mins: 55,
  },
  yoga: {
    title: "Vinyasa flow",
    subtitle: "DAY 4 · HIPS & SPINE",
    tone: "lilac",
    mins: 45,
  },
  endurance: {
    title: "Tempo run + core",
    subtitle: "DAY 4 · THRESHOLD",
    tone: "sky",
    mins: 50,
  },
  weightloss: {
    title: "Full-body conditioning",
    subtitle: "DAY 4 · METABOLIC",
    tone: "peach",
    mins: 40,
  },
};

export function ClientTodayScreen() {
  const coach = useActiveCoach();
  const { clientProfile } = useRole();

  const exercises = useMemo(() => {
    if (coach.planType === "yoga") return yogaExercises;
    if (coach.planType === "endurance") return enduranceExercises;
    return strengthExercises;
  }, [coach.planType]);

  const meta = PLAN_META[coach.planType] || PLAN_META.strength;

  const [done, setDone] = useState<Record<string, boolean>>({
    [exercises[0].id]: true,
  });
  const [open, setOpen] = useState<Exercise | null>(null);

  const completed = Object.values(done).filter(Boolean).length;
  const pct = Math.round((completed / exercises.length) * 100);

  const toggle = (id: string) => setDone((d) => ({ ...d, [id]: !d[id] }));

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-5 pt-5 pb-30"
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting and Profile Badge */}
      <View className="flex-row items-center justify-between px-1">
        <View className="flex-1 pr-4">
          <Text className="text-[13px] text-muted-foreground">
            Friday, June 26 · with {coach.name.split(" ")[0]}
          </Text>
          <Text className="text-[26px] font-bold tracking-tight text-foreground mt-0.5">
            Hey, {clientProfile.fname}{" "}
            <Icon name="wave" size={26} color="--primary" />
          </Text>
        </View>
      </View>

      {/* GitHub-style Activity Grid */}
      <StreakHero todayCompleted={completed} todayTotal={exercises.length} />

      {/* Workout Card */}
      <WorkoutCard
        exercises={exercises}
        meta={meta}
        done={done}
        completed={completed}
        pct={pct}
        onToggle={toggle}
        onOpenExercise={setOpen}
      />

      {/* Nutrition Cards */}
      <View>
        <SectionTitle
          title="Nutrition today"
          action={
            <Icon name="chevron-right" size={16} color="--muted-foreground" />
          }
        />
        <View className="flex-row gap-3">
          <Card tone="peach" interactive glass className="flex-1">
            <View className="flex-row items-center justify-between">
              <Icon name="apple" size={20} color="--peach-ink" />
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-peach-ink opacity-70">
                Calories
              </Text>
            </View>
            <Text className="mt-3 text-3xl font-black text-peach-ink">
              1,840
            </Text>
            <Text className="text-[12px] text-peach-ink opacity-80">
              of 2,400 kcal
            </Text>
            <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-peach-ink/15">
              <View className="h-full w-[77%] rounded-full bg-peach-ink" />
            </View>
          </Card>

          <Card tone="sky" interactive glass className="flex-1">
            <View className="flex-row items-center justify-between">
              <Icon name="droplets" size={20} color="--sky-ink" />
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-sky-ink opacity-70">
                Water
              </Text>
            </View>
            <Text className="mt-3 text-3xl font-black text-sky-ink">1.8L</Text>
            <Text className="text-[12px] text-sky-ink opacity-80">
              of 3.0L goal
            </Text>
            <View className="mt-3 flex-row gap-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View
                  key={i}
                  className={cn(
                    "h-6 flex-1 rounded-md",
                    i <= 4 ? "bg-sky-ink" : "bg-sky-ink/15"
                  )}
                />
              ))}
            </View>
          </Card>
        </View>
      </View>

      {/* Next Check-in Banner */}
      <Card tone="lilac" interactive glass>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lilac-ink opacity-70">
              Next check-in
            </Text>
            <Text className="mt-1 text-[18px] font-bold text-lilac-ink">
              Sunday · 6 PM
            </Text>
            <Text className="text-[12px] text-lilac-ink opacity-80 mt-0.5">
              Photos + weight + waist
            </Text>
          </View>
          <Pressable className="rounded-full bg-lilac-ink px-4 py-2 active:opacity-90">
            <Text className="text-[12px] font-semibold text-background">
              Prepare
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* Exercise Bottom Modal Drawer */}
      <ExerciseSheet
        exercise={open}
        onClose={() => setOpen(null)}
        onDone={(id) => toggle(id)}
      />
    </ScrollView>
  );
}

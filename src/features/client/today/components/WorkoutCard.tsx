import React from "react";
import { View, Text, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { Tone } from "@/tw/Tone";
import { Card } from "@/shared/ui/Card";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { Icon } from "@/shared/ui/Icon";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/lib/data";
import type { ToneName } from "@/tw/Tone";

interface PlanMeta {
  title: string;
  subtitle: string;
  tone: ToneName;
  mins: number;
}

interface WorkoutCardProps {
  exercises: Exercise[];
  meta: PlanMeta;
  done: Record<string, boolean>;
  completed: number;
  pct: number;
  onToggle: (id: string) => void;
  onOpenExercise: (ex: Exercise) => void;
}

export function WorkoutCard({
  exercises,
  meta,
  done,
  completed,
  pct,
  onToggle,
  onOpenExercise,
}: WorkoutCardProps) {
  return (
    <View>
      <SectionTitle
        title="Today's workout"
        action={
          <Text className="text-[12px] font-medium text-muted-foreground">
            {completed}/{exercises.length} done
          </Text>
        }
      />
      <Card className="p-0 overflow-hidden">
        {/* Card Top Tone Gradient Banner */}
        <Tone name={meta.tone} className="flex-row items-center justify-between gap-3 p-5" glass>
          <View className="flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70">
              {meta.subtitle}
            </Text>
            <Text className="mt-1 text-[22px] font-bold leading-tight text-foreground">
              {meta.title}
            </Text>
            <Text className="mt-1 text-[12px] text-foreground/80">
              ≈ {meta.mins} min · {exercises.length} exercises
            </Text>
          </View>
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-foreground/10">
            <Icon name="dumbbell" size={24} color="--foreground" />
          </View>
        </Tone>

        {/* Workout Progress Bar */}
        <View className="px-5 pt-4">
          <View className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </View>
        </View>

        {/* Exercises Checklist */}
        <View className="p-2 gap-1.5 mt-2">
          {exercises.map((ex) => {
            const isDone = done[ex.id];
            return (
              <Pressable
                key={ex.id}
                onPress={() => onOpenExercise(ex)}
                className="flex-row w-full items-center gap-3 rounded-2xl p-2.5 bg-card active:bg-secondary/40"
              >
                <Image
                  source={ex.image}
                  className="h-14 w-14 shrink-0 rounded-2xl bg-secondary"
                />
                <View className="flex-1 min-w-0">
                  <Text className="truncate text-[14.5px] font-semibold text-foreground">
                    {ex.name}
                  </Text>
                  <Text className="text-[12px] text-muted-foreground mt-0.5">
                    {ex.sets} × {ex.reps} · {ex.weight}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onToggle(ex.id)}
                  className={cn(
                    "h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                    isDone ? "border-success bg-success" : "border-border bg-card active:border-primary"
                  )}
                >
                  {isDone && <Icon name="check" size={16} color="#ffffff" />}
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      </Card>
    </View>
  );
}

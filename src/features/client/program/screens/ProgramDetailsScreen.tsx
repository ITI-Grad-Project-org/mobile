import React, { useState, useMemo } from "react";
import { ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { View, Text, Pressable, ScrollView } from "@/tw";
import { Icon } from "@/shared/ui/Icon";
import { Tone } from "@/tw/Tone";
import { Card } from "@/shared/ui/Card";
import { useGetMyProgramQuery } from "@/api/endpoints/training.endpoints";
import { cn } from "@/lib/utils";

interface ProgramDetailsScreenProps {
  programId: string;
}

export function ProgramDetailsScreen({ programId }: ProgramDetailsScreenProps) {
  const { data: programData, isLoading, isError } = useGetMyProgramQuery(programId, {
    skip: !programId,
  });

  const program = programData?.data || programData;
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  const weeksList = useMemo(() => {
    return Array.isArray(program?.weeks) ? program.weeks : [];
  }, [program]);

  const totalWeeks = useMemo(() => {
    if (weeksList.length > 0) return weeksList.length;
    if (typeof program?.durationWeeks === "number" && program.durationWeeks > 1) return program.durationWeeks;
    return 1;
  }, [weeksList, program]);

  const days = useMemo(() => {
    if (weeksList.length > 0) {
      const targetWeek = weeksList[selectedWeekIndex] || weeksList[0];
      return targetWeek?.days || [];
    }
    const flatDays = program?.days || program?.programDays || [];
    if (Array.isArray(flatDays) && flatDays.length > 0) {
      const matchingDays = flatDays.filter((d: any) => (d.weekNumber || 1) === selectedWeekIndex + 1);
      if (matchingDays.length > 0) return matchingDays;
      if (flatDays.length > 7) return flatDays.slice(selectedWeekIndex * 7, (selectedWeekIndex + 1) * 7);
      return flatDays;
    }
    return [];
  }, [program, weeksList, selectedWeekIndex]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <ActivityIndicator size="large" color="--primary" />
        <Text className="mt-4 text-[14px] text-muted-foreground">Loading program details...</Text>
      </View>
    );
  }

  if (isError || !program) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Icon name="alert-triangle" size={32} color="--destructive" />
        <Text className="mt-3 text-[16px] font-bold text-foreground">Program not found</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-secondary px-4 py-2 active:opacity-80"
        >
          <Text className="text-[13px] font-semibold text-foreground">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <Tone name="lilac" className="px-5 pt-12 pb-6" glass>
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full bg-black/20 active:bg-black/40"
        >
          <Icon name="chevron-left" size={16} color="--foreground" />
        </Pressable>
        <Text className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-lilac-ink opacity-80">
          Published Program
        </Text>
        <Text className="mt-1 text-[26px] font-bold text-lilac-ink">{program.name}</Text>
        {program.description ? (
          <Text className="mt-2 text-[13px] text-lilac-ink/80 leading-relaxed">
            {program.description}
          </Text>
        ) : null}

        <View className="mt-4 flex-row items-center gap-3">
          <View className="rounded-full bg-lilac-ink/15 px-3 py-1">
            <Text className="text-[11px] font-bold text-lilac-ink uppercase">
              {program.difficulty || "All Levels"}
            </Text>
          </View>
          <View className="rounded-full bg-lilac-ink/15 px-3 py-1">
            <Text className="text-[11px] font-bold text-lilac-ink uppercase">
              {program.durationWeeks ? `${program.durationWeeks} Weeks` : "Ongoing"}
            </Text>
          </View>
        </View>
      </Tone>

      {/* Program Days List */}
      <ScrollView contentContainerClassName="p-4 gap-y-4 pb-20" showsVerticalScrollIndicator={false}>
        {/* Week Switcher Card */}
        {totalWeeks > 1 ? (
          <Card glass className="flex-row items-center justify-between p-3">
            <Pressable
              onPress={() => setSelectedWeekIndex((w) => Math.max(0, w - 1))}
              disabled={selectedWeekIndex === 0}
              className={cn(
                "h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-70",
                selectedWeekIndex === 0 && "opacity-40"
              )}
              accessibilityLabel="Previous week"
            >
              <Icon name="chevron-left" size={16} color="--foreground" />
            </Pressable>

            <View className="items-center">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {program?.schedulePhase ? program.schedulePhase.replace("_", " ") : "BLOCK A"}
              </Text>
              <Text className="text-[16px] font-bold text-foreground">
                Week {selectedWeekIndex + 1} of {totalWeeks}
              </Text>
            </View>

            <Pressable
              onPress={() => setSelectedWeekIndex((w) => Math.min(totalWeeks - 1, w + 1))}
              disabled={selectedWeekIndex >= totalWeeks - 1}
              className={cn(
                "h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-70",
                selectedWeekIndex >= totalWeeks - 1 && "opacity-40"
              )}
              accessibilityLabel="Next week"
            >
              <Icon name="chevron-right" size={16} color="--foreground" />
            </Pressable>
          </Card>
        ) : null}

        <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Prescribed Workouts ({days.length})
        </Text>

        {days.length === 0 ? (
          <Card glass className="py-6 items-center">
            <Text className="text-[14px] text-muted-foreground">No prescribed days found.</Text>
          </Card>
        ) : (
          days.map((day: any, idx: number) => (
            <Card key={day.id || idx} glass className="p-4 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Day {idx + 1} {day.isRestDay ? "· Rest Day" : ""}
                </Text>
                <Text className="text-[16px] font-bold text-foreground mt-0.5">
                  {day.name || `Workout Day ${idx + 1}`}
                </Text>
                {day.notes ? (
                  <Text className="text-[12px] text-muted-foreground mt-1" numberOfLines={1}>
                    {day.notes}
                  </Text>
                ) : null}
              </View>

              {!day.isRestDay && (
                <Pressable
                  onPress={() => router.push(`/workout/${day.id}` as any)}
                  className="flex-row items-center gap-1 rounded-xl bg-primary px-3.5 py-2 active:opacity-90 shrink-0"
                >
                  <Text className="text-[12px] font-bold text-primary-foreground">Start</Text>
                  <Icon name="chevron-right" size={14} color="#ffffff" />
                </Pressable>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

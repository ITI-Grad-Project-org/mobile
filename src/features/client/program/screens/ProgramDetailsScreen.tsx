import React, { useState, useMemo } from "react";
import { ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { View, Text, ScrollView } from "@/tw";
import { Icon } from "@/shared/ui/Icon";
import { Tone } from "@/tw/Tone";
import { Card } from "@/shared/ui/Card";
import { useGetMyProgramQuery } from "@/api/endpoints/training.endpoints";
import { GlassButton } from "@/shared/ui/GlassButton";

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
        <GlassButton
          onPress={() => router.back()}
          className="mt-4 rounded-full px-4 py-2.5"
          accessibilityLabel="Go back"
        >
          <Text className="text-[13px] font-semibold text-foreground">Go Back</Text>
        </GlassButton>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header — sits under the AppHeader, so no extra top inset here. */}
      <Tone name="lilac" className="px-5 pt-4 pb-5" glass>
        <View className="flex-row items-center gap-3">
          <GlassButton
            onPress={() => router.back()}
            accessibilityLabel="Back"
            className="h-9 w-9 rounded-full"
          >
            <Icon name="chevron-left" size={16} color="--foreground" />
          </GlassButton>
          <Text
            className="flex-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-lilac-ink opacity-80"
            numberOfLines={1}
          >
            Published Program
          </Text>
        </View>

        <Text className="mt-3 text-[24px] font-bold leading-tight text-lilac-ink">
          {program.name}
        </Text>
        {program.description ? (
          <Text className="mt-1.5 text-[13px] leading-relaxed text-lilac-ink/80" numberOfLines={3}>
            {program.description}
          </Text>
        ) : null}

        <View className="mt-3.5 flex-row flex-wrap items-center gap-2">
          <View className="rounded-full bg-lilac-ink/15 px-3 py-1">
            <Text className="text-[11px] font-bold uppercase text-lilac-ink">
              {program.difficulty || "All Levels"}
            </Text>
          </View>
          <View className="rounded-full bg-lilac-ink/15 px-3 py-1">
            <Text className="text-[11px] font-bold uppercase text-lilac-ink">
              {program.durationWeeks ? `${program.durationWeeks} Weeks` : "Ongoing"}
            </Text>
          </View>
          {program.goal ? (
            <View className="rounded-full bg-lilac-ink/15 px-3 py-1">
              <Text className="text-[11px] font-bold uppercase text-lilac-ink">
                {String(program.goal).replace(/_/g, " ")}
              </Text>
            </View>
          ) : null}
        </View>
      </Tone>

      {/* Program Days List */}
      <ScrollView contentContainerClassName="p-4 gap-y-4 pb-20" showsVerticalScrollIndicator={false}>
        {/* Week Switcher Card */}
        {totalWeeks > 1 ? (
          <Card glass className="flex-row items-center justify-between p-2.5">
            <GlassButton
              onPress={() => setSelectedWeekIndex((w) => Math.max(0, w - 1))}
              disabled={selectedWeekIndex === 0}
              className="h-11 w-11 rounded-full"
              accessibilityLabel="Previous week"
            >
              <Icon name="chevron-left" size={16} color="--foreground" />
            </GlassButton>

            <View className="items-center">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {program?.schedulePhase ? program.schedulePhase.replace("_", " ") : "BLOCK A"}
              </Text>
              <Text className="text-[16px] font-bold text-foreground">
                Week {selectedWeekIndex + 1} of {totalWeeks}
              </Text>
            </View>

            <GlassButton
              onPress={() => setSelectedWeekIndex((w) => Math.min(totalWeeks - 1, w + 1))}
              disabled={selectedWeekIndex >= totalWeeks - 1}
              className="h-11 w-11 rounded-full"
              accessibilityLabel="Next week"
            >
              <Icon name="chevron-right" size={16} color="--foreground" />
            </GlassButton>
          </Card>
        ) : null}

        <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Prescribed Workouts ({days.length})
        </Text>

        {days.length === 0 ? (
          <Card glass className="items-center py-8">
            <Icon name="clipboard-list" size={28} color="--muted-foreground" />
            <Text className="mt-2 text-[14px] font-semibold text-foreground">
              No days in this week
            </Text>
            <Text className="mt-1 text-[12px] text-muted-foreground">
              Your coach hasn&apos;t prescribed anything here yet.
            </Text>
          </Card>
        ) : (
          days.map((day: any, idx: number) => {
            const exerciseCount = Array.isArray(day.exercises)
              ? day.exercises.length
              : Array.isArray(day.prescribedExercises)
                ? day.prescribedExercises.length
                : null;

            const body = (
              <>
                <View className="min-w-0 flex-1 pr-3">
                  <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Day {idx + 1}
                    {exerciseCount !== null && !day.isRestDay
                      ? ` · ${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}`
                      : ""}
                  </Text>
                  <Text className="mt-0.5 text-[16px] font-bold text-foreground" numberOfLines={1}>
                    {day.name || `Workout Day ${idx + 1}`}
                  </Text>
                  {day.notes ? (
                    <Text className="mt-1 text-[12px] text-muted-foreground" numberOfLines={1}>
                      {day.notes}
                    </Text>
                  ) : null}
                </View>

                {day.isRestDay ? (
                  <View className="shrink-0 rounded-full bg-secondary px-3 py-1.5">
                    <Text className="text-[11px] font-bold uppercase text-muted-foreground">
                      Rest
                    </Text>
                  </View>
                ) : (
                  <View className="h-11 shrink-0 flex-row items-center gap-1 rounded-sm bg-primary px-4">
                    <Text className="text-[13px] font-bold text-primary-foreground">Start</Text>
                    <Icon name="chevron-right" size={13} color="--primary-foreground" />
                  </View>
                )}
              </>
            );

            // Rest days have nowhere to go, so only workout days are pressable —
            // and the whole card is the target, not just the pill.
            return day.isRestDay ? (
              <Card
                key={day.id || idx}
                glass
                className="flex-row items-center justify-between p-4"
              >
                {body}
              </Card>
            ) : (
              <Card
                key={day.id || idx}
                glass
                interactive
                onPress={() => router.push(`/workout/${day.id}` as any)}
                accessibilityRole="button"
                accessibilityLabel={`Start ${day.name || `workout day ${idx + 1}`}`}
                className="flex-row items-center justify-between p-4"
              >
                {body}
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

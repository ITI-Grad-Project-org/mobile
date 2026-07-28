import {
  useAddExtraSetMutation,
  useCompleteWorkoutMutation,
  useGetTrainingDayQuery,
  useGetWorkoutLogQuery,
  useLogSetMutation,
  useRemoveExtraSetMutation,
  useSkipTrainingDayMutation,
  useStartOrResumeLogMutation,
} from "@/api/endpoints/training.endpoints";
import type { SetOutcome } from "@/api/types";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { Tone } from "@/tw/Tone";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { SetRow } from "../components/SetRow";
import { WorkoutCompleteModal } from "../components/WorkoutCompleteModal";

interface WorkoutLogScreenProps {
  programDayId: string;
}

export function WorkoutLogScreen({ programDayId }: WorkoutLogScreenProps) {
  const [logId, setLogId] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const { data: dayQueryData } = useGetTrainingDayQuery(programDayId, {
    skip: !programDayId,
  });

  const [startOrResumeLog, { isLoading: isStarting }] = useStartOrResumeLogMutation();

  const { data: logData, isLoading: isLogLoading } = useGetWorkoutLogQuery(logId ?? "", {
    skip: !logId,
  });

  const [logSet, { isLoading: isLoggingSet }] = useLogSetMutation();
  const [addExtraSet, { isLoading: isAddingExtra }] = useAddExtraSetMutation();
  const [removeExtraSet] = useRemoveExtraSetMutation();
  const [skipDay, { isLoading: isSkipping }] = useSkipTrainingDayMutation();
  const [completeWorkout, { isLoading: isCompleting }] = useCompleteWorkoutMutation();

  // Initialize or resume workout log on mount
  useEffect(() => {
    if (!programDayId) return;

    startOrResumeLog(programDayId)
      .unwrap()
      .then((res) => {
        setLogError(null);
        if (res?.id) {
          setLogId(res.id);
        } else if (res?.data?.id) {
          setLogId(res.data.id);
        }
      })
      .catch((err) => {
        console.warn("Could not start or resume workout log:", err);
        const errMsg = err?.data?.message || err?.message || "Future program days cannot be logged";
        setLogError(errMsg);
      });
  }, [programDayId, startOrResumeLog]);

  const dayData = dayQueryData?.data || dayQueryData;
  const activeLog = logData?.data || logData;
  const exercises =
    activeLog?.exercises ||
    activeLog?.loggedExercises ||
    activeLog?.programDay?.exercises ||
    dayData?.exercises ||
    dayData?.prescribedExercises ||
    [];
  const dayTitle =
    activeLog?.programDay?.name ||
    activeLog?.name ||
    dayData?.name ||
    dayData?.title ||
    "Prescribed Workout";

  const handleSaveSet = async ({
    loggedSetId,
    outcome,
    reps,
    weightKg,
    rpe,
  }: {
    loggedSetId: string;
    outcome: SetOutcome;
    reps?: number;
    weightKg?: number;
    rpe?: number;
  }) => {
    if (!logId) return;
    try {
      await logSet({
        logId,
        loggedSetId,
        body: {
          outcome,
          reps,
          weightKg,
          rpe,
        },
      }).unwrap();
    } catch (err) {
      console.warn("Failed to log set:", err);
    }
  };

  const handleAddExtraSet = async (loggedExerciseId: string) => {
    if (!logId) return;
    try {
      await addExtraSet({
        logId,
        body: {
          loggedExerciseId,
          outcome: "completed",
          reps: 10,
        },
      }).unwrap();
    } catch (err) {
      console.warn("Failed to add extra set:", err);
    }
  };

  const handleRemoveExtraSet = async (loggedSetId: string) => {
    if (!logId) return;
    try {
      await removeExtraSet({
        logId,
        loggedSetId,
      }).unwrap();
    } catch (err) {
      console.warn("Failed to remove extra set:", err);
    }
  };

  const handleSkipWorkout = async () => {
    try {
      await skipDay(programDayId).unwrap();
      router.back();
    } catch (err) {
      console.warn("Failed to skip workout:", err);
    }
  };

  const handleCompleteWorkoutConfirm = async (data: {
    durationMinutes?: number;
    clientNotes?: string;
    overallRpe?: number;
  }) => {
    if (!logId) return;
    try {
      await completeWorkout({
        logId,
        body: data,
      }).unwrap();
      setShowCompleteModal(false);
      router.back();
    } catch (err) {
      console.warn("Failed to complete workout:", err);
    }
  };

  if (isStarting || (logId && isLogLoading)) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <ActivityIndicator size="large" color="--primary" />
        <Text className="mt-4 text-[15px] font-semibold text-foreground">
          Starting your workout log...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header Bar */}
      <Tone name={logError ? "peach" : "mint"} className="px-5 pt-12 pb-5" glass>
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full bg-black/20 active:bg-black/40"
          >
            <Icon name="chevron-left" size={16} color="--foreground" />
          </Pressable>
          <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">
            {logError ? "Future Workout Preview" : "Active Workout Log"}
          </Text>
          {!logError ? (
            <Pressable
              onPress={handleSkipWorkout}
              disabled={isSkipping}
              className="px-3 py-1.5 rounded-full bg-black/10 active:bg-black/20"
            >
              <Text className="text-[11px] font-semibold text-mint-ink">
                {isSkipping ? "Skipping..." : "Skip Day"}
              </Text>
            </Pressable>
          ) : (
            <View className="w-9" />
          )}
        </View>

        <Text className="mt-3 text-[24px] font-bold text-foreground">{dayTitle}</Text>
        {activeLog?.notes || dayData?.notes ? (
          <Text className="mt-1 text-[12.5px] text-foreground/80">
            {activeLog?.notes || dayData?.notes}
          </Text>
        ) : null}
      </Tone>

      {logError ? (
        <Tone name="sun" glass className="mx-4 mt-3 rounded-2xl p-3.5 flex-row items-center gap-3">
          <Icon name="clock" size={20} color="--sun-ink" />
          <View className="flex-1">
            <Text className="font-bold text-[13px] text-sun-ink">
              Logging Locked
            </Text>
            <Text className="text-[12px] text-sun-ink/90 mt-0.5">
              {logError}
            </Text>
          </View>
        </Tone>
      ) : null}

      {/* Exercises List */}
      <ScrollView contentContainerClassName="p-4 gap-y-6 pb-28" showsVerticalScrollIndicator={false}>
        {exercises.length === 0 ? (
          <Card glass className="items-center py-8">
            <Icon name="dumbbell" size={32} color="--muted-foreground" />
            <Text className="mt-2 text-[15px] font-semibold text-foreground">
              No exercises prescribed for today
            </Text>
            <Text className="text-[12px] text-muted-foreground mt-1">
              Check in with your coach or choose another day.
            </Text>
          </Card>
        ) : (
          exercises.map((exItem: any, exIdx: number) => {
            const exerciseName = exItem?.exercise?.name || exItem?.name || `Exercise ${exIdx + 1}`;
            const sets = exItem?.sets || exItem?.loggedSets || [];
            const loggedExId = exItem?.id;

            return (
              <Card key={exItem?.id || exIdx} glass className="p-4 gap-y-3">
                {/* Exercise Header */}
                <View className="flex-row items-center justify-between border-b border-border/40 pb-3">
                  <View className="flex-1 pr-2">
                    <Text className="text-[16px] font-bold text-foreground">
                      {exIdx + 1}. {exerciseName}
                    </Text>
                    {exItem?.coachNotes ? (
                      <Text className="text-[12px] text-muted-foreground mt-0.5">
                        Note: {exItem.coachNotes}
                      </Text>
                    ) : null}
                  </View>
                  <View className="h-8 w-8 items-center justify-center rounded-xl bg-secondary">
                    <Icon name="dumbbell" size={16} color="--foreground" />
                  </View>
                </View>

                {/* Sets List */}
                <View className="gap-y-2">
                  {sets.map((set: any, sIdx: number) => (
                    <View key={set.id || sIdx} className="flex-row items-center gap-1">
                      <View className="flex-1">
                        <SetRow
                          setNumber={sIdx + 1}
                          loggedSetId={set.id}
                          setType={set.isExtra ? "extra" : set.setType}
                          prescribedReps={set.repsMin ? `${set.repsMin}-${set.repsMax || set.repsMin}` : undefined}
                          prescribedWeightKg={set.weightKg}
                          prescribedRpe={set.intensityValue}
                          initialOutcome={set.outcome}
                          initialReps={set.actualReps ?? set.reps}
                          initialWeightKg={set.actualWeightKg ?? set.weightKg}
                          initialRpe={set.rpe}
                          isSaving={isLoggingSet}
                          onSaveSet={handleSaveSet}
                        />
                      </View>
                      {set.isExtra || set.isExtraSet ? (
                        <Pressable
                          onPress={() => handleRemoveExtraSet(set.id)}
                          className="h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 active:bg-destructive/20"
                        >
                          <Icon name="x" size={14} color="--destructive" />
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </View>

                {/* Add Extra Set */}
                {loggedExId && !logError ? (
                  <Pressable
                    onPress={() => handleAddExtraSet(loggedExId)}
                    disabled={isAddingExtra}
                    className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-secondary/50 active:bg-secondary border border-dashed border-border/60 mt-1"
                  >
                    <Icon name="plus" size={14} color="--muted-foreground" />
                    <Text className="text-[12px] font-semibold text-muted-foreground">
                      Add Extra Set
                    </Text>
                  </Pressable>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Sticky Complete / Return Footer */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-border/60 bg-card/95 px-5 py-4">
        {logError ? (
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4 active:opacity-90 shadow-soft"
          >
            <Icon name="chevron-left" size={18} color="#ffffff" />
            <Text className="text-[16px] font-bold text-primary-foreground">
              Return to Training Plan
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setShowCompleteModal(true)}
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4 active:opacity-90 shadow-soft"
          >
            <Icon name="check" size={18} color="#ffffff" />
            <Text className="text-[16px] font-bold text-primary-foreground">
              Finish & Log Workout
            </Text>
          </Pressable>
        )}
      </View>

      {/* Completion Modal */}
      <WorkoutCompleteModal
        visible={showCompleteModal}
        isLoading={isCompleting}
        onClose={() => setShowCompleteModal(false)}
        onConfirm={handleCompleteWorkoutConfirm}
      />
    </View>
  );
}

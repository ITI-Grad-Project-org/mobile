import type { SetOutcome } from "@/api/types";
import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, TextInput, View } from "@/tw";
import { useState } from "react";

interface SetRowProps {
  setNumber: number;
  loggedSetId: string;
  setType?: string;
  prescribedReps?: string;
  prescribedWeightKg?: number;
  prescribedRpe?: number;
  initialOutcome?: SetOutcome;
  initialReps?: number;
  initialWeightKg?: number;
  initialRpe?: number;
  isSaving?: boolean;
  onSaveSet: (params: {
    loggedSetId: string;
    outcome: SetOutcome;
    reps?: number;
    weightKg?: number;
    rpe?: number;
  }) => void;
}

export function SetRow({
  setNumber,
  loggedSetId,
  setType = "working",
  prescribedReps,
  prescribedWeightKg,
  prescribedRpe,
  initialOutcome,
  initialReps,
  initialWeightKg,
  initialRpe,
  isSaving,
  onSaveSet,
}: SetRowProps) {
  const [outcome, setOutcome] = useState<SetOutcome | undefined>(initialOutcome);
  const [reps, setReps] = useState<string>(
    initialReps !== undefined ? String(initialReps) : prescribedReps ? String(prescribedReps).split("-")[0] : ""
  );
  const [weightKg, setWeightKg] = useState<string>(
    initialWeightKg !== undefined ? String(initialWeightKg) : prescribedWeightKg !== undefined ? String(prescribedWeightKg) : ""
  );
  const [rpe] = useState<string>(
    initialRpe !== undefined ? String(initialRpe) : prescribedRpe !== undefined ? String(prescribedRpe) : ""
  );

  const handleOutcomeClick = (targetOutcome: SetOutcome) => {
    const nextOutcome = outcome === targetOutcome ? undefined : targetOutcome;
    setOutcome(nextOutcome);

    if (nextOutcome) {
      onSaveSet({
        loggedSetId,
        outcome: nextOutcome,
        reps: reps ? Number(reps) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        rpe: rpe ? Number(rpe) : undefined,
      });
    }
  };

  const isCompleted = outcome === "completed";
  const isPartial = outcome === "partial";
  const isSkipped = outcome === "skipped";

  return (
    <View
      className={cn(
        "flex-row items-center justify-between rounded-2xl p-3 border transition-colors",
        isCompleted
          ? "bg-success/10 border-success/30"
          : isPartial
            ? "bg-warning/10 border-warning/30"
            : isSkipped
              ? "bg-muted/30 border-border/40 opacity-60"
              : "bg-card border-border/60"
      )}
    >
      {/* Set Number & Type */}
      <View className="w-14 shrink-0">
        <Text className="text-[13px] font-bold text-foreground">Set {setNumber}</Text>
        <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {setType}
        </Text>
      </View>

      {/* Target Preview */}
      <View className="flex-1 px-2">
        <Text className="text-[12px] text-muted-foreground">
          Target: {prescribedWeightKg ? `${prescribedWeightKg}kg × ` : ""}
          {prescribedReps ? `${prescribedReps} reps` : "—"}
          {prescribedRpe ? ` @ RPE ${prescribedRpe}` : ""}
        </Text>
      </View>

      {/* Actual Inputs: Weight & Reps */}
      <View className="flex-row items-center gap-1.5 mr-2">
        {/* Weight Input */}
        <View className="flex-row items-center rounded-xl bg-secondary/80 px-2 py-1">
          <TextInput
            keyboardType="numeric"
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder={prescribedWeightKg ? String(prescribedWeightKg) : "0"}
            className="w-10 text-center text-[13px] font-bold text-foreground p-0"
            maxLength={5}
          />
          <Text className="text-[10px] font-medium text-muted-foreground ml-0.5">kg</Text>
        </View>

        {/* Reps Input */}
        <View className="flex-row items-center rounded-xl bg-secondary/80 px-2 py-1">
          <TextInput
            keyboardType="numeric"
            value={reps}
            onChangeText={setReps}
            placeholder={prescribedReps ? String(prescribedReps).split("-")[0] : "0"}
            className="w-8 text-center text-[13px] font-bold text-foreground p-0"
            maxLength={4}
          />
          <Text className="text-[10px] font-medium text-muted-foreground ml-0.5">reps</Text>
        </View>
      </View>

      {/* Outcome Buttons */}
      <View className="flex-row items-center gap-1 shrink-0">
        {/* Complete button */}
        <Pressable
          onPress={() => handleOutcomeClick("completed")}
          disabled={isSaving}
          className={cn(
            "h-8 w-8 items-center justify-center rounded-xl transition-all",
            isCompleted
              ? "bg-success text-success-foreground"
              : "bg-secondary/60 active:bg-success/20"
          )}
          accessibilityLabel="Mark set completed"
        >
          <Icon name="check" size={15} color={isCompleted ? "#ffffff" : "--muted-foreground"} />
        </Pressable>

        {/* Skip button */}
        <Pressable
          onPress={() => handleOutcomeClick("skipped")}
          disabled={isSaving}
          className={cn(
            "h-8 w-8 items-center justify-center rounded-xl transition-all",
            isSkipped
              ? "bg-muted text-muted-foreground"
              : "bg-secondary/40 active:bg-destructive/20"
          )}
          accessibilityLabel="Mark set skipped"
        >
          <Icon name="x" size={14} color={isSkipped ? "--foreground" : "--muted-foreground"} />
        </Pressable>
      </View>
    </View>
  );
}

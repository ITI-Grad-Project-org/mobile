import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { Stepper } from "./Stepper";
import {
  MIN_WEIGHT,
  WEIGHT_STEP,
  formatWeight,
  fromKg,
  toKg,
  type WeightUnit,
} from "../lib/units";

/** Short, non-wrapping labels — the old row wrapped "WORKING" into "WORKIN G". */
const SET_TYPE_LABEL: Record<string, string> = {
  working: "Working",
  warmup: "Warm-up",
  drop_set: "Backoff",
  amrap: "AMRAP",
  to_failure: "To failure",
  extra: "Extra",
};

export interface SetDraft {
  /** Display-unit weight. `null` = unknown, confirm stays disabled. */
  weight: number | null;
  reps: number | null;
}

interface SetCardProps {
  setNumber: number;
  setType?: string;
  isExtra?: boolean;
  /** Prescribed target, already formatted (e.g. "8–10 @ RPE 7.5"). */
  target: string;
  draft: SetDraft;
  isLogged: boolean;
  /** Reported to the server as `outcome: "skipped"` — the set was not performed. */
  isSkipped?: boolean;
  unit: WeightUnit;
  disabled?: boolean;
  onChange: (draft: SetDraft) => void;
  onToggleLogged: () => void;
  onToggleSkipped?: () => void;
  onRemove?: () => void;
}

export function SetCard({
  setNumber,
  setType = "working",
  isExtra,
  target,
  draft,
  isLogged,
  isSkipped,
  unit,
  disabled,
  onChange,
  onToggleLogged,
  onToggleSkipped,
  onRemove,
}: SetCardProps) {
  const typeLabel = SET_TYPE_LABEL[isExtra ? "extra" : setType] ?? SET_TYPE_LABEL.working;
  const canConfirm = draft.weight !== null && draft.reps !== null;
  // A skipped set has no numbers to edit or confirm until it is un-skipped.
  const inputsDisabled = disabled || isSkipped;

  return (
    <View
      className={cn(
        "rounded-lg border p-3.5 gap-y-3",
        isLogged ? "border-primary bg-primary/10" : "border-border bg-card",
        isSkipped && "border-border bg-secondary/40 opacity-60",
        disabled && !isLogged && "opacity-70"
      )}
    >
      {/* Line 1 — identity + target */}
      <View className="flex-row items-center gap-2">
        <Text
          className={cn(
            "text-[12px] font-bold uppercase tracking-widest",
            isLogged ? "text-primary" : "text-foreground"
          )}
        >
          Set {setNumber}
        </Text>
        <View
          className={cn(
            "rounded-full px-2 py-0.5",
            isLogged ? "bg-primary/15" : "bg-secondary"
          )}
        >
          <Text
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider",
              isLogged ? "text-primary" : "text-muted-foreground"
            )}
          >
            {typeLabel}
          </Text>
        </View>
        <Text className="flex-1 text-right text-[12px] text-muted-foreground" numberOfLines={1}>
          {target}
        </Text>
        {/* Skipping is only offered while the set is still open — a logged set is
            un-logged first, so the two states can never disagree. */}
        {onToggleSkipped && !disabled && !isLogged ? (
          <Pressable
            onPress={onToggleSkipped}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: Boolean(isSkipped) }}
            accessibilityLabel={
              isSkipped ? `Un-skip set ${setNumber}` : `Skip set ${setNumber}`
            }
            className={cn(
              "rounded-full px-2 py-0.5 active:opacity-60",
              isSkipped ? "bg-foreground/10" : "bg-secondary"
            )}
          >
            <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isSkipped ? "Skipped" : "Skip"}
            </Text>
          </Pressable>
        ) : null}
        {onRemove && !disabled ? (
          <Pressable
            onPress={onRemove}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Remove extra set ${setNumber}`}
            className="h-6 w-6 items-center justify-center rounded-full bg-destructive/10 active:opacity-60"
          >
            <Icon name="x" size={11} color="--destructive" />
          </Pressable>
        ) : null}
      </View>

      {/* Line 2 — steppers + confirm */}
      <View className="flex-row items-center gap-2">
        <Stepper
          label={`weight for set ${setNumber}`}
          value={draft.weight}
          unit={unit}
          step={WEIGHT_STEP[unit]}
          // The floor, not just the starting point: 2.5 kg / 5 lb is as low as
          // the stepper goes — 0 is not a weight anyone logs.
          min={MIN_WEIGHT[unit]}
          fallback={MIN_WEIGHT[unit]}
          format={formatWeight}
          disabled={inputsDisabled}
          tone={isLogged ? "done" : "default"}
          onChange={(weight) => onChange({ ...draft, weight })}
        />
        <Stepper
          label={`reps for set ${setNumber}`}
          value={draft.reps}
          unit="reps"
          step={1}
          min={1}
          max={999}
          fallback={1}
          disabled={inputsDisabled}
          tone={isLogged ? "done" : "default"}
          onChange={(reps) => onChange({ ...draft, reps })}
        />
        <Pressable
          onPress={onToggleLogged}
          disabled={inputsDisabled || (!isLogged && !canConfirm)}
          accessibilityRole="button"
          accessibilityState={{ checked: isLogged }}
          accessibilityLabel={
            isLogged ? `Undo set ${setNumber}` : `Log set ${setNumber}`
          }
          className={cn(
            "h-14 w-14 items-center justify-center rounded-sm border active:opacity-70",
            isLogged
              ? "border-primary bg-primary"
              : "border-border bg-secondary",
            (inputsDisabled || (!isLogged && !canConfirm)) && "opacity-40"
          )}
        >
          <Icon name="check" size={20} color={isLogged ? "--ink" : "--muted-foreground"} />
        </Pressable>
      </View>
    </View>
  );
}

/** Converts a stored (kg) set into the display-unit draft the card edits. */
export function draftFromKg(
  weightKg: number | null | undefined,
  reps: number | null | undefined,
  unit: WeightUnit
): SetDraft {
  return {
    weight:
      weightKg === null || weightKg === undefined
        ? null
        : Math.round(fromKg(weightKg, unit) * 10) / 10,
    reps: reps === null || reps === undefined ? null : reps,
  };
}

/** Converts an edited draft back to the kg the API expects. */
export function draftToKg(draft: SetDraft, unit: WeightUnit): number | undefined {
  return draft.weight === null ? undefined : Math.round(toKg(draft.weight, unit) * 100) / 100;
}

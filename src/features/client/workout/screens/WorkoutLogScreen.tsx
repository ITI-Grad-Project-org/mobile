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
import { plannedExerciseInfo } from "@/lib/plannedExercise";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Card } from "@/shared/ui/Card";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import {
  dayProgressKey,
  exerciseNameKey,
  mergeDayProgress,
  todayIso,
} from "@/shared/utils/dayProgress";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { Animated } from "@/tw/animated";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView as RNScrollView,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ExerciseRail } from "../components/ExerciseRail";
import { RestDock } from "../components/RestDock";
import { SetCard, draftFromKg, draftToKg, type SetDraft } from "../components/SetCard";
import { WorkoutCompleteModal } from "../components/WorkoutCompleteModal";
import {
  DEFAULT_REST_SECONDS,
  formatClock,
  useElapsedSeconds,
  useRestTimer,
} from "../hooks/useRestTimer";
import {
  MIN_WEIGHT,
  formatWeight,
  fromKg,
  useWeightUnit,
  type WeightUnit,
} from "../lib/units";

/** Past this much horizontal travel the card commits to the next exercise. */
const SWIPE_THRESHOLD = 55;

interface WorkoutLogScreenProps {
  programDayId: string;
}

/** A set, flattened out of the several shapes the training API returns. */
interface NormalizedSet {
  id: string;
  setType: string;
  isExtra: boolean;
  target: string;
  serverDraft: SetDraft;
  serverLogged: boolean;
  serverSkipped: boolean;
}

interface NormalizedExercise {
  id: string;
  /** Every id this exercise may be keyed by in the shared day-progress map. */
  progressIds: string[];
  name: string;
  detailChip: string | null;
  targetChip: string | null;
  lastTime: string | null;
  coachNotes: string | null;
  restSeconds: number;
  sets: NormalizedSet[];
}

// The training endpoints are typed `any` (see api/endpoints/training.endpoints.ts),
// so the raw payloads are read defensively and normalized into the interfaces
// above — `any` below is the untyped API payload, not a shortcut.

function repsTarget(set: any): string | null {
  const min = set?.repsMin ?? set?.reps;
  const max = set?.repsMax;
  if (min === undefined || min === null) return null;
  return max && max !== min ? `${min}–${max}` : `${min}`;
}

function setTarget(prescribed: any, unit: WeightUnit): string {
  const parts: string[] = [];
  const reps = repsTarget(prescribed);
  if (prescribed?.weightKg !== undefined && prescribed?.weightKg !== null) {
    parts.push(`${formatWeight(fromKg(prescribed.weightKg, unit))} ${unit}`);
  }
  if (reps) parts.push(`${reps} reps`);
  if (prescribed?.intensityValue) parts.push(`RPE ${prescribed.intensityValue}`);
  if (prescribed?.durationSeconds) parts.push(`${prescribed.durationSeconds}s`);
  return parts.length ? parts.join(" · ") : "No target";
}

/** Does this look like a LOGGED set rather than a prescribed one? A logged set's
 *  own `reps`/`weightKg` are what the client did, so they must never be read as
 *  the coach's target — see UpdatePrescribedLoggedSetDto vs PrescribedSetDto. */
function isLoggedSet(set: any): boolean {
  return (
    set?.outcome !== undefined ||
    set?.actualReps !== undefined ||
    set?.actualWeightKg !== undefined ||
    set?.loggedReps !== undefined ||
    set?.loggedWeightKg !== undefined
  );
}

/**
 * The prescription behind a set. A logged set wraps its prescribed set the way a
 * logged exercise wraps its planned one (see lib/plannedExercise); the training
 * responses carry no OpenAPI schema, so every known alias is tried before giving
 * up and letting the caller fall back to the program day's own prescription.
 */
function prescriptionOf(set: any): any | null {
  const nested =
    set?.prescribedSet ?? set?.plannedSet ?? set?.programSet ?? set?.prescription;
  if (nested) return nested;
  return isLoggedSet(set) ? null : (set ?? null);
}

/** The prescribed sets of a planned exercise, whichever key the payload uses. */
function plannedSetsOf(exercise: any): any[] {
  const sets = exercise?.sets || exercise?.prescribedSets || exercise?.plannedSets;
  return Array.isArray(sets) ? sets : [];
}

/**
 * The program day's prescription for a logged exercise. Matched by id first —
 * a logged exercise carries the planned one's id under one of several names —
 * then by position, since both lists describe the same day in the same order.
 */
function matchPrescribed(planned: any[], item: any, index: number): any | null {
  if (!Array.isArray(planned) || planned.length === 0) return null;
  const ids = [
    item?.plannedExerciseId,
    item?.programExerciseId,
    item?.prescribedExerciseId,
    item?.exerciseId,
    item?.exercise?.id,
  ].filter(Boolean);
  const byId = planned.find(
    (p: any) => ids.includes(p?.id) || (p?.exerciseId && ids.includes(p.exerciseId))
  );
  return byId ?? planned[index] ?? null;
}

/** "Last time · 100 kg × 8, 8, 8", when the payload carries a previous session. */
function lastTimeLine(exercise: any, unit: WeightUnit): string | null {
  const history: any[] =
    exercise?.lastSession?.sets ?? exercise?.previousSets ?? exercise?.lastPerformance?.sets ?? [];
  if (!Array.isArray(history) || history.length === 0) return null;

  const reps = history
    .map((s) => s?.reps ?? s?.actualReps)
    .filter((r) => r !== undefined && r !== null);
  if (reps.length === 0) return null;

  const weightKg = history.find((s) => (s?.weightKg ?? s?.actualWeightKg) != null);
  const weight = weightKg
    ? `${formatWeight(fromKg(weightKg.weightKg ?? weightKg.actualWeightKg, unit))} ${unit} × `
    : "";
  return `Last time · ${weight}${reps.join(", ")}`;
}

export function WorkoutLogScreen({ programDayId }: WorkoutLogScreenProps) {
  const [logId, setLogId] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Kept apart from saveError: the dock is hidden behind the completion sheet.
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const setsScrollRef = useRef<RNScrollView>(null);

  // Local overrides so a tap on the check lands instantly; the server value is
  // the fallback for anything the client hasn't touched this session.
  const [draftOverrides, setDraftOverrides] = useState<Record<string, SetDraft>>({});
  const [loggedOverrides, setLoggedOverrides] = useState<Record<string, boolean>>({});
  const [skippedOverrides, setSkippedOverrides] = useState<Record<string, boolean>>({});

  const { tenantId } = useActiveTenant();
  const insets = useSafeAreaInsets();
  const unit = useWeightUnit();
  const rest = useRestTimer();
  const [sessionStartedAt] = useState(() => Date.now());
  const elapsed = useElapsedSeconds(sessionStartedAt);

  const { data: dayQueryData } = useGetTrainingDayQuery(
    { tenantId: tenantId ?? "", programDayId },
    { skip: !tenantId || !programDayId }
  );

  const [startOrResumeLog, { isLoading: isStarting }] = useStartOrResumeLogMutation();

  const { data: logData, isLoading: isLogLoading } = useGetWorkoutLogQuery(
    { tenantId: tenantId ?? "", logId: logId ?? "" },
    { skip: !tenantId || !logId }
  );

  const [logSet] = useLogSetMutation();
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
        const errMsg = err?.data?.message || err?.message || "Future program days cannot be logged";
        setLogError(errMsg);
      });
  }, [programDayId, startOrResumeLog]);

  const dayData = dayQueryData?.data || dayQueryData;
  const activeLog = logData?.data || logData;
  const rawExercises: any[] = useMemo(
    () =>
      activeLog?.exercises ||
      activeLog?.loggedExercises ||
      activeLog?.programDay?.exercises ||
      dayData?.exercises ||
      dayData?.prescribedExercises ||
      [],
    [activeLog, dayData]
  );
  const dayTitle =
    activeLog?.programDay?.name ||
    activeLog?.name ||
    dayData?.name ||
    dayData?.title ||
    "Prescribed workout";

  /** Read-only: a finalized log, or a day that can't be logged yet. */
  const isLocked = Boolean(logError) || Boolean(activeLog?.completedAt || activeLog?.finishedAt);

  // The day's own prescription. `rawExercises` prefers the LOG payload once one
  // exists, and a logged set carries actuals rather than the coach's numbers —
  // so the targets have to be read back off the program day alongside it.
  const prescribedExercises: any[] = useMemo(
    () => dayData?.exercises || dayData?.prescribedExercises || [],
    [dayData]
  );

  const exercises: NormalizedExercise[] = useMemo(() => {
    return rawExercises.map((item: any, index: number) => {
      const sets: any[] = item?.sets || item?.loggedSets || [];
      const planned = matchPrescribed(prescribedExercises, item, index);
      const plannedSets = plannedSetsOf(planned);
      // Extra sets have no prescription, so they must not consume a planned slot
      // and shift every prescribed set after them onto the wrong target.
      let plannedCursor = 0;
      // The prescribed exercise is flat (exerciseName, primaryMuscle, equipment[]);
      // see lib/plannedExercise.
      const info = plannedExerciseInfo(item, index);
      const details = [info.equipment.join(", "), info.muscle]
        .filter(Boolean)
        .join(" · ");
      const normalizedSets: NormalizedSet[] = sets.map((set: any, setIndex: number) => {
        const isExtra = Boolean(set?.isExtra || set?.isExtraSet);
        // The set's own prescription when the payload nests one, otherwise the
        // program day's set in the same slot.
        const prescribed =
          prescriptionOf(set) ?? (isExtra ? null : (plannedSets[plannedCursor] ?? null));
        if (!isExtra) plannedCursor += 1;

        // Prefill order: what was logged -> what the coach prescribed. A value
        // is only ever `null` when neither exists, and the card blocks confirm.
        const loggedWeight = set?.actualWeightKg ?? set?.loggedWeightKg;
        const loggedReps = set?.actualReps ?? set?.loggedReps;
        const prescribedReps =
          prescribed?.repsMin ?? prescribed?.repsMax ?? prescribed?.reps ?? null;

        const serverLogged = set?.outcome === "completed" || set?.outcome === "partial";
        const serverDraft = draftFromKg(
          loggedWeight ?? (isLoggedSet(set) ? set?.weightKg : null) ?? prescribed?.weightKg ?? null,
          loggedReps ?? (isLoggedSet(set) ? set?.reps : null) ?? prescribedReps,
          unit
        );
        // Nothing below one plate ever reaches the stepper: a missing weight, a
        // prescribed 0, or a stored value under the floor all start at MIN_WEIGHT,
        // which is also as low as the stepper itself goes.
        if (serverDraft.weight === null || serverDraft.weight < MIN_WEIGHT[unit]) {
          serverDraft.weight = MIN_WEIGHT[unit];
        }

        return {
          id: set?.id || `${item?.id}-set-${setIndex}`,
          setType: set?.setType || prescribed?.setType || "working",
          isExtra,
          target: setTarget(prescribed, unit),
          serverDraft,
          serverLogged,
          serverSkipped: set?.outcome === "skipped",
        };
      });

      const firstWorking = normalizedSets.find((s) => !s.isExtra) ?? normalizedSets[0];

      return {
        id: item?.id || `exercise-${index}`,
        // A logged exercise wraps a prescribed one, so its id usually differs
        // from the id the Today checklist knows. Carry every alias.
        progressIds: [
          item?.id,
          item?.plannedExerciseId,
          item?.programExerciseId,
          item?.prescribedExerciseId,
          item?.exerciseId,
          item?.exercise?.id,
          exerciseNameKey(info.name),
        ].filter(Boolean) as string[],
        name: info.name,
        detailChip: details || null,
        // "No target" is the set card's own placeholder — as a chip it would just
        // be a header that says nothing, so it is dropped instead.
        targetChip:
          firstWorking && firstWorking.target !== "No target" ? firstWorking.target : null,
        lastTime: lastTimeLine(item, unit),
        coachNotes: info.coachNotes || null,
        restSeconds: item?.restSeconds ?? planned?.restSeconds ?? DEFAULT_REST_SECONDS,
        sets: normalizedSets,
      };
    });
  }, [rawExercises, prescribedExercises, unit]);

  const clampedIndex = Math.min(activeIndex, Math.max(0, exercises.length - 1));

  // A new exercise starts at set 1 — don't inherit the previous one's scroll offset.
  useEffect(() => {
    setsScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [clampedIndex]);
  const activeExercise = exercises[clampedIndex];

  const draftFor = useCallback(
    (set: NormalizedSet) => draftOverrides[set.id] ?? set.serverDraft,
    [draftOverrides]
  );
  const isSetLogged = useCallback(
    (set: NormalizedSet) => loggedOverrides[set.id] ?? set.serverLogged,
    [loggedOverrides]
  );
  const isSetSkipped = useCallback(
    (set: NormalizedSet) => skippedOverrides[set.id] ?? set.serverSkipped,
    [skippedOverrides]
  );
  /** Logged or skipped — either way the client is done with the set. */
  const isSetResolved = useCallback(
    (set: NormalizedSet) => isSetLogged(set) || isSetSkipped(set),
    [isSetLogged, isSetSkipped]
  );

  const railSegments = useMemo(
    () =>
      exercises.map((exercise) => ({
        label: exercise.name,
        progress: exercise.sets.length
          ? exercise.sets.filter(isSetResolved).length / exercise.sets.length
          : 0,
      })),
    [exercises, isSetResolved]
  );

  const loggedCount = activeExercise?.sets.filter(isSetLogged).length ?? 0;
  const skippedCount = activeExercise?.sets.filter(isSetSkipped).length ?? 0;
  const totalSets = activeExercise?.sets.length ?? 0;
  const allLogged = totalSets > 0 && loggedCount + skippedCount === totalSets;
  const isLastExercise = clampedIndex >= exercises.length - 1;

  // Mirror per-exercise completion into the map the Today checklist reads, so a
  // logged set ticks its box there without waiting on a day-level refetch.
  const dayIso: string | null =
    dayData?.date || dayData?.scheduledDate || activeLog?.date || null;
  const progressKey = useMemo(() => dayProgressKey(todayIso(), tenantId), [tenantId]);

  useEffect(() => {
    // Only today's checklist is keyed here; logging a past day must not touch it.
    if (dayIso && dayIso.split("T")[0] !== todayIso()) return;
    if (exercises.length === 0) return;

    // Only ever ADD completions. Writing `false` here would wipe ticks the
    // client made by hand on Today just by opening this screen.
    const updates: Record<string, boolean> = {};
    exercises.forEach((exercise) => {
      // Every set resolved, and at least one actually performed — an exercise
      // whose sets were all skipped is finished, not done.
      if (exercise.sets.length === 0 || !exercise.sets.every(isSetResolved)) return;
      if (!exercise.sets.some(isSetLogged)) return;
      exercise.progressIds.forEach((id) => {
        updates[id] = true;
      });
    });
    if (Object.keys(updates).length === 0) return;
    mergeDayProgress(progressKey, updates);
  }, [exercises, isSetLogged, isSetResolved, progressKey, dayIso]);

  const exerciseVolume = useMemo(() => {
    if (!activeExercise) return 0;
    return activeExercise.sets.reduce((total, set) => {
      if (!isSetLogged(set)) return total;
      const draft = draftFor(set);
      if (draft.weight === null || draft.reps === null) return total;
      return total + draft.weight * draft.reps;
    }, 0);
  }, [activeExercise, draftFor, isSetLogged]);

  // ----- Swipe between exercises
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const settle = useCallback(() => {
    translateX.set(withSpring(0, { damping: 22, stiffness: 190, mass: 0.7 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Swap the content while it is off-screen, then bring it in from the far side. */
  const applyIndex = useCallback(
    (index: number, enterFrom: number) => {
      setActiveIndex(index);
      translateX.set(enterFrom * screenWidth * 0.4);
      settle();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screenWidth, settle]
  );

  const goToExercise = useCallback(
    (index: number) => {
      // Out of range (or already there): rubber-band back instead of sticking.
      if (index < 0 || index > exercises.length - 1 || index === clampedIndex) {
        settle();
        return;
      }
      const exitTo = index > clampedIndex ? -1 : 1;
      translateX.set(
        withTiming(
          exitTo * screenWidth * 0.4,
          { duration: 140, easing: Easing.out(Easing.quad) },
          (finished?: boolean) => {
            "worklet";
            if (finished) runOnJS(applyIndex)(index, -exitTo);
          }
        )
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applyIndex, clampedIndex, exercises.length, screenWidth, settle]
  );

  // The card tracks the drag, resists at the ends, and hands off to goToExercise.
  const panGesture = useMemo(
    () => {
      const isFirst = clampedIndex === 0;
      const isLast = clampedIndex >= exercises.length - 1;
      return Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-14, 14])
        .onUpdate((event) => {
          const dx = event.translationX;
          const atEdge = (dx > 0 && isFirst) || (dx < 0 && isLast);
          translateX.set(atEdge ? dx * 0.3 : dx);
        })
        .onEnd((event) => {
          // A quick flick counts even when it never travels the full threshold.
          const flick = Math.abs(event.velocityX) > 550;
          const past = Math.abs(event.translationX) > SWIPE_THRESHOLD;
          if (!flick && !past) {
            translateX.set(withSpring(0, { damping: 22, stiffness: 190, mass: 0.7 }));
            return;
          }
          const forward = event.translationX < 0;
          runOnJS(goToExercise)(clampedIndex + (forward ? 1 : -1));
        });
    },
    // translateX is a shared value — a stable identity, so it stays out of deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clampedIndex, exercises.length, goToExercise]
  );

  const cardStyle = useAnimatedStyle(() => {
    const x = translateX.get();
    const travel = Math.min(1, Math.abs(x) / (screenWidth * 0.4));
    return {
      transform: [{ translateX: x }, { scale: 1 - travel * 0.04 }],
      opacity: 1 - travel * 0.7,
    };
  });

  // ----- Actions
  const handleToggleSet = async (set: NormalizedSet) => {
    const wasLogged = isSetLogged(set);
    const draft = draftFor(set);

    if (wasLogged) {
      // The API has no "un-log" (outcome is required and has no empty state), so
      // this clears the row locally only — see the note in the PR description.
      setLoggedOverrides((prev) => ({ ...prev, [set.id]: false }));
      return;
    }

    if (draft.weight === null || draft.reps === null) return;

    // Optimistic: paint the completed state and start resting immediately.
    setLoggedOverrides((prev) => ({ ...prev, [set.id]: true }));
    setSkippedOverrides((prev) => ({ ...prev, [set.id]: false }));
    setDraftOverrides((prev) => ({ ...prev, [set.id]: draft }));
    setSaveError(null);
    rest.start(activeExercise?.restSeconds ?? DEFAULT_REST_SECONDS);

    if (!logId) return;
    try {
      await logSet({
        logId,
        loggedSetId: set.id,
        body: {
          outcome: "completed",
          reps: draft.reps,
          weightKg: draftToKg(draft, unit),
        },
      }).unwrap();
    } catch (err: any) {
      setLoggedOverrides((prev) => ({ ...prev, [set.id]: wasLogged }));
      setSaveError(err?.data?.message || "Couldn't save that set. It stays unlogged.");
    }
  };

  /**
   * Reports a prescribed set as not performed:
   * PATCH /client/me/training/logs/{logId}/sets/{loggedSetId} with
   * `outcome: "skipped"` — no reps or weight, since none were done.
   */
  const handleToggleSkipSet = async (set: NormalizedSet) => {
    const wasSkipped = isSetSkipped(set);

    if (wasSkipped) {
      // Same as un-logging: `outcome` is required and has no empty state, so
      // this only reopens the row locally until the client logs or skips it.
      setSkippedOverrides((prev) => ({ ...prev, [set.id]: false }));
      return;
    }

    setSkippedOverrides((prev) => ({ ...prev, [set.id]: true }));
    setLoggedOverrides((prev) => ({ ...prev, [set.id]: false }));
    setSaveError(null);

    if (!logId) return;
    try {
      await logSet({
        logId,
        loggedSetId: set.id,
        body: { outcome: "skipped" },
      }).unwrap();
    } catch (err: any) {
      setSkippedOverrides((prev) => ({ ...prev, [set.id]: wasSkipped }));
      setSaveError(err?.data?.message || "Couldn't skip that set. It stays open.");
    }
  };

  const handleAddSet = async () => {
    if (!logId || !activeExercise) return;
    const lastSet = activeExercise.sets[activeExercise.sets.length - 1];
    const draft = lastSet ? draftFor(lastSet) : { weight: null, reps: null };
    try {
      await addExtraSet({
        logId,
        body: {
          loggedExerciseId: activeExercise.id,
          outcome: "completed",
          reps: draft.reps ?? 10,
          weightKg: draftToKg(draft, unit),
        },
      }).unwrap();
    } catch (err: any) {
      setSaveError(err?.data?.message || "Couldn't add a set.");
    }
  };

  const handleRemoveSet = async (setId: string) => {
    if (!logId) return;
    try {
      await removeExtraSet({ logId, loggedSetId: setId }).unwrap();
    } catch (err: any) {
      setSaveError(err?.data?.message || "Couldn't remove that set.");
    }
  };

  const handleSkipWorkout = async () => {
    try {
      await skipDay(programDayId).unwrap();
      router.back();
    } catch (err: any) {
      setSaveError(err?.data?.message || "Couldn't skip this day.");
    }
  };

  /**
   * The log id comes from the mount effect, but that call can fail or land after
   * the client reaches the last exercise — so re-resolve it rather than no-op.
   */
  const ensureLogId = async (): Promise<string | null> => {
    if (logId) return logId;
    try {
      const res = await startOrResumeLog(programDayId).unwrap();
      const id = res?.id ?? res?.data?.id ?? null;
      if (id) setLogId(id);
      return id;
    } catch {
      return null;
    }
  };

  const handleCompleteWorkoutConfirm = async (data: {
    durationMinutes?: number;
    clientNotes?: string;
    overallRpe?: number;
  }) => {
    setCompleteError(null);

    const id = await ensureLogId();
    if (!id) {
      setCompleteError(
        logError ??
          "This session isn't open for logging yet, so it can't be finished. Go back and start it again."
      );
      return;
    }

    try {
      await completeWorkout({ logId: id, body: data }).unwrap();
      setShowCompleteModal(false);
      router.back();
    } catch (err: any) {
      setCompleteError(
        err?.data?.message ||
          err?.error ||
          "Couldn't finish the workout. Check your connection and try again."
      );
    }
  };

  const handlePrimaryAction = () => {
    if (isLastExercise) {
      setCompleteError(null);
      setShowCompleteModal(true);
      return;
    }
    goToExercise(clampedIndex + 1);
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

  if (!activeExercise) {
    return (
      <View className="flex-1 bg-background p-4">
        <Card glass className="items-center py-8">
          <Icon name="dumbbell" size={32} color="--muted-foreground" />
          <Text className="mt-2 text-[15px] font-semibold text-foreground">
            No exercises prescribed for today
          </Text>
          <Text className="mt-1 text-[12px] text-muted-foreground">
            Check in with your coach or choose another day.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-4 rounded-sm bg-secondary px-4 py-2.5 active:opacity-70"
          >
            <Text className="text-[13px] font-semibold text-foreground">
              Return to training plan
            </Text>
          </Pressable>
        </Card>
      </View>
    );
  }

  const primaryLabel = isLastExercise
    ? "Finish workout"
    : allLogged
      ? "Next exercise"
      : "Skip ahead";

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-start gap-3 px-4 pt-4 pb-3">
        <GlassButton
          onPress={() => router.back()}
          accessibilityLabel="Back to training plan"
          className="h-9 w-9 rounded-full"
        >
          <Icon name="chevron-left" size={16} color="--foreground" />
        </GlassButton>
        <View className="flex-1">
          <Text
            className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
            numberOfLines={1}
          >
            {dayTitle}
          </Text>
          <Text className="mt-0.5 text-[13px] font-semibold text-foreground">
            {isLocked ? "Logged session" : "Live session"}
          </Text>
        </View>
        {!isLocked ? (
          <View className="flex-row items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
            <Icon name="clock" size={12} color="--primary" />
            <Text
              className="text-[13px] font-bold text-primary"
              style={{ fontVariant: ["tabular-nums"] }}
              accessibilityLabel={`Session elapsed ${formatClock(elapsed)}`}
            >
              {formatClock(elapsed)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Whole-workout overview */}
      <View className="pb-3">
        <ExerciseRail
          segments={railSegments}
          activeIndex={clampedIndex}
          onSelect={goToExercise}
        />
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View className="flex-1" style={cardStyle}>
          {/* Exercise header */}
          <View className="px-4 pb-3">
            <Text className="text-[26px] font-bold leading-tight text-foreground">
              {activeExercise.name}
            </Text>
            <View className="mt-2 flex-row flex-wrap items-center gap-2">
              {activeExercise.detailChip ? (
                <View className="rounded-full bg-secondary px-2.5 py-1">
                  <Text className="text-[11px] font-semibold text-muted-foreground">
                    {activeExercise.detailChip}
                  </Text>
                </View>
              ) : null}
              {activeExercise.targetChip ? (
                <View className="rounded-full bg-primary/10 px-2.5 py-1">
                  <Text className="text-[11px] font-semibold text-primary">
                    {activeExercise.targetChip}
                  </Text>
                </View>
              ) : null}
            </View>
            {activeExercise.lastTime ? (
              <Text className="mt-2 text-[12px] text-muted-foreground">
                {activeExercise.lastTime}
              </Text>
            ) : null}
            {activeExercise.coachNotes ? (
              <Text className="mt-1 text-[12px] text-muted-foreground">
                Note: {activeExercise.coachNotes}
              </Text>
            ) : null}
          </View>

          {/* Sets */}
          <ScrollView
            ref={setsScrollRef}
            className="flex-1"
            contentContainerClassName="px-4 pb-4 gap-y-2.5"
            showsVerticalScrollIndicator={false}
          >
            {activeExercise.sets.map((set, index) => (
              <SetCard
                key={set.id}
                setNumber={index + 1}
                setType={set.setType}
                isExtra={set.isExtra}
                target={set.target}
                draft={draftFor(set)}
                isLogged={isSetLogged(set)}
                isSkipped={isSetSkipped(set)}
                unit={unit}
                disabled={isLocked}
                onChange={(draft) =>
                  setDraftOverrides((prev) => ({ ...prev, [set.id]: draft }))
                }
                onToggleLogged={() => handleToggleSet(set)}
                // Extra sets are removed, not skipped — they were never prescribed.
                onToggleSkipped={set.isExtra ? undefined : () => handleToggleSkipSet(set)}
                onRemove={set.isExtra ? () => handleRemoveSet(set.id) : undefined}
              />
            ))}

            {!isLocked ? (
              <Pressable
                onPress={handleAddSet}
                disabled={isAddingExtra}
                accessibilityRole="button"
                accessibilityLabel="Add a set"
                className={cn(
                  "h-12 flex-row items-center justify-center gap-1.5 rounded-sm border border-dashed border-border active:opacity-70",
                  isAddingExtra && "opacity-50"
                )}
              >
                <Icon name="plus" size={13} color="--muted-foreground" />
                <Text className="text-[13px] font-semibold text-muted-foreground">Add set</Text>
              </Pressable>
            ) : null}

            <Text className="px-1 text-[12px] text-muted-foreground">
              Volume · {formatWeight(Math.round(exerciseVolume * 10) / 10)} {unit}
            </Text>
          </ScrollView>
        </Animated.View>
      </GestureDetector>

      {/* Bottom dock — padded past the home indicator and the rounded screen
          corners, which otherwise clip the status line and "Skip day". */}
      <View
        className="border-t border-border bg-card pt-3 gap-y-2.5"
        style={{
          paddingBottom: Math.max(insets.bottom, 12),
          paddingLeft: Math.max(insets.left, 16),
          paddingRight: Math.max(insets.right, 16),
        }}
      >
        {saveError ? (
          <View className="flex-row items-center gap-2 rounded-sm bg-destructive/10 px-3 py-2">
            <Icon name="alert-triangle" size={13} color="--destructive" />
            <Text className="flex-1 text-[12px] text-destructive">{saveError}</Text>
          </View>
        ) : null}

        {!isLocked && rest.isResting ? (
          <RestDock
            remaining={rest.remaining}
            total={rest.totalSeconds}
            onExtend={() => rest.extend(30)}
            onSkip={rest.skip}
          />
        ) : null}

        {isLocked ? (
          <>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              className="h-14 flex-row items-center justify-center gap-2 rounded-sm bg-primary active:opacity-90"
            >
              <Icon name="chevron-left" size={16} color="--primary-foreground" />
              <Text className="text-[15px] font-bold text-primary-foreground">
                Return to training plan
              </Text>
            </Pressable>
            <View className="flex-row items-center gap-1.5">
              <Icon name="clock" size={12} color="--muted-foreground" />
              <Text className="flex-1 text-[12px] text-muted-foreground">
                Logging locked · {logError ?? "this session is already finalized"}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View className="flex-row items-center gap-2">
              <GlassButton
                onPress={() => goToExercise(clampedIndex - 1)}
                disabled={clampedIndex === 0}
                accessibilityLabel="Previous exercise"
                className="h-14 w-14 rounded-sm border border-border"
              >
                <Icon name="chevron-left" size={16} color="--foreground" />
              </GlassButton>
              <Pressable
                onPress={handlePrimaryAction}
                accessibilityRole="button"
                className="h-14 flex-1 items-center justify-center rounded-sm bg-primary active:opacity-90"
              >
                <Text className="text-[15px] font-bold text-primary-foreground">
                  {primaryLabel}
                </Text>
              </Pressable>
            </View>

            <View className="flex-row items-center gap-2">
              <Text className="flex-1 text-[12px] text-muted-foreground">
                {loggedCount} of {totalSets} sets logged
                {skippedCount > 0 ? ` · ${skippedCount} skipped` : ""} · swipe to change
                exercise
              </Text>
              <Pressable
                onPress={handleSkipWorkout}
                disabled={isSkipping}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Skip this training day"
              >
                <Text className="text-[12px] font-semibold text-muted-foreground">
                  {isSkipping ? "Skipping…" : "Skip day"}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <WorkoutCompleteModal
        visible={showCompleteModal}
        isLoading={isCompleting}
        error={completeError}
        defaultDurationMinutes={Math.max(1, Math.round(elapsed / 60))}
        onClose={() => {
          setShowCompleteModal(false);
          setCompleteError(null);
        }}
        onConfirm={handleCompleteWorkoutConfirm}
      />
    </View>
  );
}

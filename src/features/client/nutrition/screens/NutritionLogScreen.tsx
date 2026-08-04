import {
  useAddActualFoodMutation,
  useCompleteNutritionLogMutation,
  useDeleteActualFoodMutation,
  useGetNutritionDayQuery,
  useGetNutritionLogQuery,
  useSetLoggedMealOutcomeMutation,
  useSkipNutritionDayMutation,
  useStartOrResumeNutritionLogMutation,
  useUpdateActualFoodMutation,
  useUpdateNutritionLogMutation,
} from "@/api/endpoints/nutrition.endpoints";
import type {
  CreateActualFoodLogDto,
  MealOutcome,
  MealSlot,
  UpdateActualFoodLogDto,
} from "@/api/types";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { todayIso } from "@/shared/utils/dayProgress";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator } from "react-native";
import { AddFoodSheet } from "../components/AddFoodSheet";
import { CompleteDayModal } from "../components/CompleteDayModal";
import { LoggedFoodRow } from "../components/LoggedFoodRow";
import { MealCard } from "../components/MealCard";
import { TargetsCard } from "../components/TargetsCard";
import { WaterCard } from "../components/WaterCard";
import {
  consumedMacros,
  errorMessage,
  formatDayTitle,
  isConflict,
  MEAL_SLOTS,
  normalizeDay,
  normalizeLog,
  pendingMeals,
  SLOT_LABEL,
  unwrap,
  type LoggedFood,
  type PlannedMeal,
} from "../data";

const WATER_DEBOUNCE_MS = 700;

interface NutritionLogScreenProps {
  dayId: string;
}

export function NutritionLogScreen({ dayId }: NutritionLogScreenProps) {
  const [logId, setLogId] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Kept apart from saveError: the dock is hidden behind the completion sheet.
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Local overrides so an outcome tap lands instantly; the server value is the
  // fallback for anything the client hasn't touched this session.
  const [outcomeOverrides, setOutcomeOverrides] = useState<Record<string, MealOutcome>>({});
  const [savingMealId, setSavingMealId] = useState<string | null>(null);
  const [removingFoodId, setRemovingFoodId] = useState<string | null>(null);

  const [sheet, setSheet] = useState<{ slot: MealSlot } | null>(null);
  const [editingFood, setEditingFood] = useState<LoggedFood | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const { data: dayQueryData, isLoading: isDayLoading } = useGetNutritionDayQuery(dayId, {
    skip: !dayId,
  });

  const [startOrResume, { isLoading: isStarting }] = useStartOrResumeNutritionLogMutation();

  const { data: logQueryData, isLoading: isLogLoading } = useGetNutritionLogQuery(
    logId ?? "",
    { skip: !logId }
  );

  const [setMealOutcome] = useSetLoggedMealOutcomeMutation();
  const [addFood, { isLoading: isAddingFood }] = useAddActualFoodMutation();
  const [updateFood, { isLoading: isUpdatingFood }] = useUpdateActualFoodMutation();
  const [deleteFood] = useDeleteActualFoodMutation();
  const [updateLog] = useUpdateNutritionLogMutation();
  const [skipDay, { isLoading: isSkipping }] = useSkipNutritionDayMutation();
  const [completeLog, { isLoading: isCompleting }] = useCompleteNutritionLogMutation();

  // Start or resume the log on mount. The endpoint is idempotent, so re-entering
  // the screen picks the existing log back up rather than creating a second one.
  useEffect(() => {
    if (!dayId) return;
    startOrResume(dayId)
      .unwrap()
      .then((res: any) => {
        setLogError(null);
        const id = res?.id ?? res?.data?.id ?? null;
        if (id) setLogId(id);
      })
      .catch((err) => {
        setLogError(
          errorMessage(
            err,
            isConflict(err)
              ? "This day is closed for logging."
              : "This day can't be logged right now."
          )
        );
      });
  }, [dayId, startOrResume]);

  const iso = todayIso();
  const day = useMemo(
    () => normalizeDay(dayQueryData, unwrap(dayQueryData)?.plan ?? null, iso),
    [dayQueryData, iso]
  );
  const log = useMemo(() => normalizeLog(logQueryData), [logQueryData]);

  const isLocked = Boolean(logError) || Boolean(log?.isFinalized);

  /** The log's meals carry outcomes; the day's are the fallback before one exists. */
  const meals: PlannedMeal[] = useMemo(() => {
    if (log && log.meals.length > 0) return log.meals;
    return day?.meals ?? [];
  }, [log, day]);

  const foods: LoggedFood[] = log?.foods ?? [];

  const outcomeFor = useCallback(
    (meal: PlannedMeal) =>
      (meal.loggedMealId ? outcomeOverrides[meal.loggedMealId] : undefined) ?? meal.outcome,
    [outcomeOverrides]
  );

  const consumed = useMemo(() => consumedMacros(log, logQueryData), [log, logQueryData]);
  const targets = day?.targets ?? {};

  // ----- Water. Local value is authoritative while the debounce is in flight,
  // so a burst of taps reads smoothly and lands as one PATCH.
  const [waterDraft, setWaterDraft] = useState<number | null>(null);
  const waterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (waterTimer.current) clearTimeout(waterTimer.current);
    };
  }, []);

  const waterMl = waterDraft ?? log?.waterMlConsumed ?? 0;

  const handleWaterChange = (ml: number) => {
    setWaterDraft(ml);
    if (waterTimer.current) clearTimeout(waterTimer.current);
    waterTimer.current = setTimeout(() => {
      if (!logId) return;
      updateLog({ logId, body: { waterMlConsumed: ml } })
        .unwrap()
        .then(() => {
          setSaveError(null);
          setWaterDraft(null);
        })
        .catch((err) => {
          setWaterDraft(null);
          setSaveError(errorMessage(err, "Couldn't save your water intake."));
        });
    }, WATER_DEBOUNCE_MS);
  };

  // ----- Meal outcomes
  const handleSetOutcome = async (meal: PlannedMeal, outcome: MealOutcome) => {
    if (!logId || !meal.loggedMealId) {
      setSaveError("This meal isn't part of an open log yet.");
      return;
    }
    const previous = outcomeFor(meal);
    setOutcomeOverrides((prev) => ({ ...prev, [meal.loggedMealId!]: outcome }));
    setSavingMealId(meal.loggedMealId);
    setSaveError(null);

    try {
      await setMealOutcome({
        logId,
        loggedMealId: meal.loggedMealId,
        body: { outcome },
      }).unwrap();
    } catch (err) {
      setOutcomeOverrides((prev) => {
        const next = { ...prev };
        if (previous) next[meal.loggedMealId!] = previous;
        else delete next[meal.loggedMealId!];
        return next;
      });
      setSaveError(errorMessage(err, "Couldn't save that meal."));
    } finally {
      setSavingMealId(null);
    }
  };

  // ----- Foods
  const handleAddFood = async (body: CreateActualFoodLogDto) => {
    if (!logId) return;
    setSheetError(null);
    try {
      await addFood({ logId, body }).unwrap();
      setSheet(null);
      setEditingFood(null);
    } catch (err) {
      setSheetError(
        errorMessage(
          err,
          isConflict(err) ? "This day is closed for editing." : "Couldn't add that food."
        )
      );
    }
  };

  const handleUpdateFood = async (foodLogId: string, body: UpdateActualFoodLogDto) => {
    if (!logId) return;
    setSheetError(null);
    try {
      await updateFood({ logId, foodLogId, body }).unwrap();
      setSheet(null);
      setEditingFood(null);
    } catch (err) {
      setSheetError(errorMessage(err, "Couldn't save that change."));
    }
  };

  const handleRemoveFood = async (foodLogId: string) => {
    if (!logId) return;
    setRemovingFoodId(foodLogId);
    setSaveError(null);
    try {
      await deleteFood({ logId, foodLogId }).unwrap();
    } catch (err) {
      setSaveError(errorMessage(err, "Couldn't remove that food."));
    } finally {
      setRemovingFoodId(null);
    }
  };

  const handleSkipDay = async () => {
    try {
      await skipDay(dayId).unwrap();
      router.back();
    } catch (err) {
      setSaveError(errorMessage(err, "Couldn't skip this day."));
    }
  };

  /**
   * The log id comes from the mount effect, but that call can fail or land late —
   * so re-resolve it rather than silently no-op when finishing.
   */
  const ensureLogId = async (): Promise<string | null> => {
    if (logId) return logId;
    try {
      const res: any = await startOrResume(dayId).unwrap();
      const id = res?.id ?? res?.data?.id ?? null;
      if (id) setLogId(id);
      return id;
    } catch {
      return null;
    }
  };

  const handleComplete = async (clientNotes?: string) => {
    setCompleteError(null);

    const id = await ensureLogId();
    if (!id) {
      setCompleteError(
        logError ?? "This day isn't open for logging, so it can't be finished."
      );
      return;
    }

    try {
      // Notes live on the log itself; `complete` only finalizes.
      if (clientNotes) {
        await updateLog({ logId: id, body: { clientNotes } }).unwrap();
      }
      await completeLog(id).unwrap();
      setShowCompleteModal(false);
      router.back();
    } catch (err) {
      setCompleteError(
        errorMessage(
          err,
          isConflict(err)
            ? "Every planned meal needs an outcome before the day can be finished."
            : "Couldn't finish the day. Check your connection and try again."
        )
      );
    }
  };

  const pending = useMemo(
    () => pendingMeals(log).filter((meal) => !outcomeFor(meal)),
    [log, outcomeFor]
  );

  // ----- Render
  if (isStarting || isDayLoading || (logId && isLogLoading)) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <ActivityIndicator size="large" color="--primary" />
        <Text className="mt-4 text-[15px] font-semibold text-foreground">
          Opening your food log…
        </Text>
      </View>
    );
  }

  const dayTitle = day ? formatDayTitle(day) : "Food log";

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-start gap-3 px-4 pb-3 pt-4">
        <GlassButton
          onPress={() => router.back()}
          accessibilityLabel="Back to nutrition plan"
          className="h-9 w-9 rounded-full"
        >
          <Icon name="chevron-left" size={16} color="--foreground" />
        </GlassButton>
        <View className="flex-1">
          <Text
            numberOfLines={1}
            className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            {dayTitle}
          </Text>
          <Text className="mt-0.5 text-[13px] font-semibold text-foreground">
            {isLocked ? "Logged day" : day?.isFlexibleDay ? "Flexible day" : "Food log"}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-6 gap-y-4"
        showsVerticalScrollIndicator={false}
      >
        <TargetsCard targets={targets} consumed={consumed} title="Today so far" />

        <WaterCard
          consumedMl={waterMl}
          targetMl={targets.targetWaterMl}
          disabled={isLocked}
          onChange={handleWaterChange}
        />

        {day?.notes ? (
          <View className="rounded-sm border border-border bg-secondary/50 px-3 py-2.5">
            <Text className="text-[12.5px] leading-relaxed text-muted-foreground">
              <Text className="font-semibold text-foreground">Coach note: </Text>
              {day.notes}
            </Text>
          </View>
        ) : null}

        {/* One section per slot. Empty slots stay as a single header row so
            there's always somewhere to log an unplanned snack. */}
        {MEAL_SLOTS.map((slot) => {
          const slotMeals = meals.filter((meal) => meal.slot === slot);
          const slotFoods = foods.filter((food) => food.mealSlot === slot);
          const isEmpty = slotMeals.length === 0 && slotFoods.length === 0;

          if (isEmpty && isLocked) return null;

          return (
            <View key={slot} className="gap-2">
              <View className="flex-row items-center justify-between px-1">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {SLOT_LABEL[slot]}
                </Text>
                {!isLocked ? (
                  <Pressable
                    onPress={() => {
                      setSheetError(null);
                      setEditingFood(null);
                      // Deliberately unlinked from any planned meal: a food added
                      // from the slot header is an extra, not part of the prescription.
                      setSheet({ slot });
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Add food to ${SLOT_LABEL[slot]}`}
                    className="flex-row items-center gap-1 active:opacity-60"
                  >
                    <Icon name="plus" size={11} color="--primary" />
                    <Text className="text-[12px] font-semibold text-primary">Add</Text>
                  </Pressable>
                ) : null}
              </View>

              {slotMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  outcome={outcomeFor(meal)}
                  disabled={isLocked}
                  isSaving={savingMealId === meal.loggedMealId}
                  onSetOutcome={(outcome) => handleSetOutcome(meal, outcome)}
                />
              ))}

              {slotFoods.map((food) => (
                <LoggedFoodRow
                  key={food.id}
                  food={food}
                  disabled={isLocked}
                  isRemoving={removingFoodId === food.id}
                  onEdit={() => {
                    setSheetError(null);
                    setEditingFood(food);
                    setSheet({ slot });
                  }}
                  onRemove={() => handleRemoveFood(food.id)}
                />
              ))}

              {isEmpty ? (
                <Text className="px-1 text-[12px] text-muted-foreground">
                  Nothing logged yet.
                </Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom dock */}
      <View className="gap-y-2.5 border-t border-border bg-card px-4 pb-4 pt-3">
        {saveError ? (
          <View className="flex-row items-center gap-2 rounded-sm bg-destructive/10 px-3 py-2">
            <Icon name="alert-triangle" size={13} color="--destructive" />
            <Text className="flex-1 text-[12px] text-destructive">{saveError}</Text>
          </View>
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
                Return to nutrition plan
              </Text>
            </Pressable>
            <View className="flex-row items-center gap-1.5">
              <Icon name="clock" size={12} color="--muted-foreground" />
              <Text className="flex-1 text-[12px] text-muted-foreground">
                Logging locked · {logError ?? "this day is already finished"}
              </Text>
            </View>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => {
                setCompleteError(null);
                setShowCompleteModal(true);
              }}
              accessibilityRole="button"
              className="h-14 items-center justify-center rounded-sm bg-primary active:opacity-90"
            >
              <Text className="text-[15px] font-bold text-primary-foreground">Finish day</Text>
            </Pressable>

            <View className="flex-row items-center gap-2">
              <Text className="flex-1 text-[12px] text-muted-foreground">
                {pending.length > 0
                  ? `${pending.length} meal${pending.length === 1 ? "" : "s"} still need an outcome`
                  : "All planned meals accounted for"}
              </Text>
              <Pressable
                onPress={handleSkipDay}
                disabled={isSkipping}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Skip this nutrition day"
              >
                <Text className="text-[12px] font-semibold text-muted-foreground">
                  {isSkipping ? "Skipping…" : "Skip day"}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Both are mounted only while open, so each starts from a clean form. */}
      {sheet ? (
        <AddFoodSheet
          mealSlot={sheet.slot}
          editing={editingFood}
          isSaving={isAddingFood || isUpdatingFood}
          error={sheetError}
          onClose={() => {
            setSheet(null);
            setEditingFood(null);
            setSheetError(null);
          }}
          onAdd={handleAddFood}
          onUpdate={handleUpdateFood}
        />
      ) : null}

      {showCompleteModal ? (
        <CompleteDayModal
          consumed={consumed}
          targetCalories={targets.targetCalories}
          pending={pending}
          isLoading={isCompleting}
          error={completeError}
          onClose={() => {
            setShowCompleteModal(false);
            setCompleteError(null);
          }}
          onConfirm={handleComplete}
        />
      ) : null}
    </View>
  );
}

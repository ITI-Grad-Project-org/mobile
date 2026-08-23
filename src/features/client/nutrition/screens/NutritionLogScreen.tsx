import {
  useAddActualFoodMutation,
  useCompleteNutritionLogMutation,
  useDeleteActualFoodMutation,
  useGetNutritionCalendarQuery,
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
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { todayIso } from "@/shared/utils/dayProgress";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AddFoodSheet } from "../components/AddFoodSheet";
import { CompleteDayModal } from "../components/CompleteDayModal";
import { LoggedFoodRow } from "../components/LoggedFoodRow";
import { LogPrescribedModal } from "../components/LogPrescribedModal";
import { MealCard } from "../components/MealCard";
import { MealDetailSheet } from "../components/MealDetailSheet";
import { TargetsCard } from "../components/TargetsCard";
import { WaterCard } from "../components/WaterCard";
import {
  calendarDayId,
  consumedMacros,
  errorMessage,
  formatDayTitle,
  isConflict,
  isDayClosed,
  MEAL_SLOTS,
  mergeMeals,
  normalizeDay,
  normalizeLog,
  pendingMeals,
  readLogId,
  SLOT_LABEL,
  unwrap,
  unwrapList,
  type LoggedFood,
  type MealItem,
  type PlannedMeal,
} from "../data";

const WATER_DEBOUNCE_MS = 700;

interface NutritionLogScreenProps {
  dayId: string;
}

export function NutritionLogScreen({ dayId }: NutritionLogScreenProps) {
  const insets = useSafeAreaInsets();
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

  // Held by id, not by value, so the open sheet follows the refetched meal.
  const [detailMealId, setDetailMealId] = useState<string | null>(null);

  // Offered after "Ate it" — an outcome alone never moves the day's calories.
  const [prescribedMealId, setPrescribedMealId] = useState<string | null>(null);
  const [prescribedError, setPrescribedError] = useState<string | null>(null);
  const [isLoggingPrescribed, setIsLoggingPrescribed] = useState(false);

  const [sheet, setSheet] = useState<{ slot: MealSlot } | null>(null);
  const [editingFood, setEditingFood] = useState<LoggedFood | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Keyed by tenant — this screen is reached with a dayId in the route.
  const { tenantId } = useActiveTenant();

  const { data: dayQueryData, isLoading: isDayLoading } = useGetNutritionDayQuery(
    { tenantId: tenantId ?? "", dayId },
    { skip: !tenantId || !dayId }
  );

  const [startOrResume, { isLoading: isStarting }] = useStartOrResumeNutritionLogMutation();

  const iso = todayIso();
  const day = useMemo(
    () => normalizeDay(dayQueryData, unwrap(dayQueryData)?.plan ?? null, iso),
    [dayQueryData, iso]
  );

  // A finished day is READ-ONLY, not empty. `startOrResume` refuses it, so its
  // log has to be found in payloads that are loaded anyway — the day itself
  // first, then the calendar row for the day's date.
  const dayLogId = useMemo(() => readLogId(dayQueryData), [dayQueryData]);
  // `isFinished` first: a finalized log whose logState is "partial" is closed,
  // but `status` alone would read it as still open and let the write below fire.
  const isClosed = Boolean(day?.isFinished) || isDayClosed(day?.status);

  // Skipped unless the day is closed AND nothing cheaper carried the log id.
  // For today this hits the same cache entry the Today tab already holds.
  const needsCalendarLookup = Boolean(day?.date) && isClosed && !logId && !dayLogId;
  const { data: calendarData, isLoading: isCalendarLoading } = useGetNutritionCalendarQuery(
    { tenantId: tenantId ?? "", from: day?.date ?? "", to: day?.date ?? "" },
    { skip: !needsCalendarLookup || !tenantId }
  );
  const calendarLogIdForDay = useMemo(() => {
    if (!needsCalendarLookup) return null;
    const row = unwrapList(calendarData).find((r) => calendarDayId(r) === dayId) ?? null;
    return readLogId(row);
  }, [needsCalendarLookup, calendarData, dayId]);

  /** The log this screen reads and writes, from whichever source found it. */
  const activeLogId = logId ?? dayLogId ?? calendarLogIdForDay;

  const { data: logQueryData, isLoading: isLogLoading } = useGetNutritionLogQuery(
    { tenantId: tenantId ?? "", logId: activeLogId ?? "" },
    { skip: !tenantId || !activeLogId }
  );

  const [setMealOutcome] = useSetLoggedMealOutcomeMutation();
  const [addFood, { isLoading: isAddingFood }] = useAddActualFoodMutation();
  const [updateFood, { isLoading: isUpdatingFood }] = useUpdateActualFoodMutation();
  const [deleteFood] = useDeleteActualFoodMutation();
  const [updateLog] = useUpdateNutritionLogMutation();
  const [skipDay, { isLoading: isSkipping }] = useSkipNutritionDayMutation();
  const [completeLog, { isLoading: isCompleting }] = useCompleteNutritionLogMutation();

  // Start or resume the log. The endpoint is idempotent, so re-entering the
  // screen picks the existing log back up rather than creating a second one —
  // but it is a WRITE, so it is never sent for a day that's already finished or
  // skipped (it would 409 and leave the screen with no log to show). Waits for
  // the day so that check can be made, and stays out of the way once some other
  // source has already produced a log id.
  useEffect(() => {
    if (!dayId || isDayLoading) return;
    if (logId || dayLogId || calendarLogIdForDay) return;
    // `isClosed` already locks the screen — no error state needed for it.
    if (isClosed) return;
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
  }, [dayId, isDayLoading, logId, dayLogId, calendarLogIdForDay, isClosed, startOrResume]);

  const log = useMemo(() => normalizeLog(logQueryData), [logQueryData]);

  // Locked, but still fully rendered: a finished day keeps its meals, foods,
  // water and totals on screen — only the write affordances go away.
  const isLocked = Boolean(log?.isFinalized) || isClosed || Boolean(logError);

  /**
   * The log's meals carry the outcomes, the day's carry the full prescription
   * (photo, suggested time, coach note) — so show both, not one or the other.
   */
  const meals: PlannedMeal[] = useMemo(
    () => mergeMeals(day?.meals ?? [], log?.meals ?? []),
    [day, log]
  );

  const foods: LoggedFood[] = log?.foods ?? [];

  const outcomeFor = useCallback(
    (meal: PlannedMeal) =>
      (meal.loggedMealId ? outcomeOverrides[meal.loggedMealId] : undefined) ?? meal.outcome,
    [outcomeOverrides]
  );

  const detailMeal = useMemo(
    () => meals.find((meal) => meal.id === detailMealId) ?? null,
    [meals, detailMealId]
  );

  const prescribedMeal = useMemo(
    () => meals.find((meal) => meal.id === prescribedMealId) ?? null,
    [meals, prescribedMealId]
  );

  const consumed = useMemo(() => consumedMacros(log, logQueryData), [log, logQueryData]);
  const targets = day?.targets ?? {};

  // ----- Water. The local value stays authoritative from the first tap on.
  // Clearing it when the PATCH resolves would fall back to the not-yet-refetched
  // server number for the length of the refetch, which reads as the counter
  // bouncing back to where it was before landing on the new value.
  const [waterDraft, setWaterDraft] = useState<number | null>(null);
  const waterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The value the last write is aiming at, so a stale response can't win. */
  const waterTarget = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (waterTimer.current) clearTimeout(waterTimer.current);
    };
  }, []);

  // Once the client has set a value this session it stays on screen: it's the
  // last value the server acknowledged, and this screen is water's only writer.
  const waterMl = waterDraft ?? log?.waterMlConsumed ?? 0;

  const handleWaterChange = (ml: number) => {
    setWaterDraft(ml);
    waterTarget.current = ml;
    if (waterTimer.current) clearTimeout(waterTimer.current);
    waterTimer.current = setTimeout(() => {
      if (!activeLogId) return;
      updateLog({ logId: activeLogId, body: { waterMlConsumed: ml } })
        .unwrap()
        .then((res: any) => {
          setSaveError(null);
          // A later tap already superseded this write — leave its value alone.
          if (waterTarget.current !== ml) return;
          // Snap to what the server actually stored, in case it clamped it.
          const saved = unwrap(res)?.waterMlConsumed;
          if (typeof saved === "number" && saved !== ml) {
            waterTarget.current = saved;
            setWaterDraft(saved);
          }
        })
        .catch((err) => {
          if (waterTarget.current === ml) {
            waterTarget.current = null;
            setWaterDraft(null);
          }
          setSaveError(errorMessage(err, "Couldn't save your water intake."));
        });
    }, WATER_DEBOUNCE_MS);
  };

  // ----- Meal outcomes
  const handleSetOutcome = async (meal: PlannedMeal, outcome: MealOutcome) => {
    if (!activeLogId || !meal.loggedMealId) {
      setSaveError("This meal isn't part of an open log yet.");
      return;
    }
    const previous = outcomeFor(meal);
    setOutcomeOverrides((prev) => ({ ...prev, [meal.loggedMealId!]: outcome }));
    setSavingMealId(meal.loggedMealId);
    setSaveError(null);

    try {
      await setMealOutcome({
        logId: activeLogId,
        loggedMealId: meal.loggedMealId,
        body: { outcome },
      }).unwrap();

      // The outcome is adherence only, so offer to put the prescription in the
      // diary — unless there's nothing to add, or this meal already has entries.
      // "Skipped" is the one outcome with nothing to log.
      const alreadyLogged = foods.some((food) => food.loggedMealId === meal.loggedMealId);
      if (outcome !== "skipped" && meal.items.length > 0 && !alreadyLogged) {
        setPrescribedError(null);
        setPrescribedMealId(meal.id);
      }
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

  /**
   * Copy the chosen lines of a prescribed meal into the Food diary, one entry
   * each. Library lines log by id so the server derives their macros; a line
   * with no library Food behind it falls back to a manual entry carrying the
   * prescribed totals.
   */
  const handleLogPrescribed = async (meal: PlannedMeal, items: MealItem[]) => {
    if (!activeLogId || items.length === 0) return;
    setPrescribedError(null);
    setIsLoggingPrescribed(true);

    try {
      for (const item of items) {
        const body: CreateActualFoodLogDto =
          item.foodId && item.quantity
            ? {
                foodId: item.foodId,
                loggedMealId: meal.loggedMealId,
                mealSlot: meal.slot,
                amount: item.quantity,
              }
            : {
                loggedMealId: meal.loggedMealId,
                mealSlot: meal.slot,
                foodName: item.name,
                amount: item.quantity ?? undefined,
                calories: item.macros.calories,
                proteinG: item.macros.proteinG,
                carbsG: item.macros.carbsG,
                fatG: item.macros.fatG,
                fiberG: item.macros.fiberG,
              };
        // Sequential: a partial failure should leave the earlier lines logged
        // rather than racing several writes against the same log.
        await addFood({ logId: activeLogId, body }).unwrap();
      }
      setPrescribedMealId(null);
    } catch (err) {
      setPrescribedError(
        errorMessage(
          err,
          isConflict(err)
            ? "This day is closed for editing."
            : "Couldn't add all of it. Check the diary before retrying."
        )
      );
    } finally {
      setIsLoggingPrescribed(false);
    }
  };

  // ----- Foods
  const handleAddFood = async (body: CreateActualFoodLogDto) => {
    if (!activeLogId) return;
    setSheetError(null);
    try {
      await addFood({ logId: activeLogId, body }).unwrap();
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
    if (!activeLogId) return;
    setSheetError(null);
    try {
      await updateFood({ logId: activeLogId, foodLogId, body }).unwrap();
      setSheet(null);
      setEditingFood(null);
    } catch (err) {
      setSheetError(errorMessage(err, "Couldn't save that change."));
    }
  };

  const handleRemoveFood = async (foodLogId: string) => {
    if (!activeLogId) return;
    setRemovingFoodId(foodLogId);
    setSaveError(null);
    try {
      await deleteFood({ logId: activeLogId, foodLogId }).unwrap();
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
    if (activeLogId) return activeLogId;
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
  if (isStarting || isDayLoading || isCalendarLoading || (activeLogId && isLogLoading)) {
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
                  onOpenDetails={() => setDetailMealId(meal.id)}
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

      {/* Bottom dock — padded past the home indicator and the rounded screen
          corners, which otherwise clip "Finish day" and the status line. */}
      <View
        className="gap-y-2.5 border-t border-border bg-card pt-3"
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

      {prescribedMeal ? (
        <LogPrescribedModal
          meal={prescribedMeal}
          outcome={outcomeFor(prescribedMeal) ?? "completed"}
          isLoading={isLoggingPrescribed}
          error={prescribedError}
          onClose={() => {
            setPrescribedMealId(null);
            setPrescribedError(null);
          }}
          onConfirm={(items) => handleLogPrescribed(prescribedMeal, items)}
        />
      ) : null}

      {detailMeal ? (
        <MealDetailSheet
          meal={detailMeal}
          outcome={outcomeFor(detailMeal)}
          disabled={isLocked}
          isSaving={savingMealId === detailMeal.loggedMealId}
          onSetOutcome={(outcome) => handleSetOutcome(detailMeal, outcome)}
          onClose={() => setDetailMealId(null)}
        />
      ) : null}

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

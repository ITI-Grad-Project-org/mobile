import { NutritionTodayCards } from "@/features/client/nutrition";
import { CheckInCard } from "@/features/client/progress";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Icon } from "@/shared/ui/Icon";
import { Surface } from "@/shared/ui/Surface";
import {
  dayProgressKey,
  exerciseNameKey,
  readDayProgress,
  writeDayProgress,
} from "@/shared/utils/dayProgress";
import { Pressable, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl } from "react-native";
import { ExerciseSheet } from "../components/ExerciseSheet";
import { StreakHero } from "../components/StreakHero";
import { WorkoutCard } from "../components/WorkoutCard";
import { useTodayData } from "../hooks/useTodayData";

const HIT_SLOP = { top: 8, bottom: 8, left: 6, right: 6 };

export function TodayScreen() {
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";

  // Every read this screen and its three sections need, resolved as one unit —
  // see useTodayData for why the sections no longer fetch on their own clock.
  const {
    today,
    todayIso,
    clientFirstName,
    coachName,
    todayDayId,
    exercises,
    meta,
    serverDayCompleted,
    isLoading,
    isFetching,
    isError,
    refetchAll,
  } = useTodayData();

  const [done, setDone] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<any | null>(null);

  const { tenantId } = useActiveTenant();
  const storageKey = useMemo(
    () => dayProgressKey(todayIso, tenantId),
    [todayIso, tenantId]
  );

  // Re-read on focus, not just on mount: Today stays mounted as a tab while the
  // workout logger writes ticks into the same store. The store is authoritative
  // — every local toggle here writes to it too.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      readDayProgress(storageKey).then((stored) => {
        if (isActive) setDone(stored);
      });
      return () => {
        isActive = false;
      };
    }, [storageKey])
  );

  const mergedDone = useMemo(() => {
    // Resolve every exercise to a single value keyed by the id this screen uses.
    // The stored map may key the same exercise by its logged id or its name, so
    // it can't just be spread over the server map.
    const resolved: Record<string, boolean> = {};
    exercises.forEach((ex) => {
      const local = done[ex.id] ?? done[exerciseNameKey(ex.name)];
      // A hand-tick on this screen is authoritative — including un-ticking a day
      // the server considers finished.
      resolved[ex.id] = local ?? (serverDayCompleted || ex.serverLogged);
    });
    return resolved;
  }, [serverDayCompleted, exercises, done]);

  // Count against today's exercises rather than every key in the map — the map
  // also holds logged-exercise ids written by the workout logger.
  const completed = exercises.filter((ex) => mergedDone[ex.id]).length;
  const pct = exercises.length > 0 ? Math.round((completed / exercises.length) * 100) : 0;

  const toggle = (id: string) => {
    // Toggle against the resolved value, not the raw map: an exercise can read
    // as done via the server or the logger's name key without `done[id]` set,
    // and toggling that would otherwise be a no-op on the first tap.
    const next = { ...done, [id]: !mergedDone[id] };
    setDone(next);
    writeDayProgress(storageKey, next);
  };

  const refreshControl = (
    <RefreshControl
      // Never during the first load — the spinner below already owns that.
      refreshing={isFetching && !isLoading}
      onRefresh={refetchAll}
      tintColor={primaryColor}
    />
  );

  const header = (
    <View className="flex-row items-center justify-between px-1">
      <View className="flex-1 pr-4">
        <Text className="text-[13px] text-muted-foreground">
          {today}
          {coachName ? ` · with ${coachName}` : ""}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-2">
          <Text
            className="shrink text-[26px] font-bold tracking-tight text-foreground"
            numberOfLines={1}
          >
            Hey {clientFirstName}
          </Text>
          {/* A symbol, not the 👋 character: the emoji rendered as a blank
              glyph on iOS. SymbolView can't be nested inside Text, so it sits
              beside it — hence the row. */}
          <Icon name="wave" size={22} color="--primary" />
        </View>
      </View>
    </View>
  );

  if (isError) {
    // Only the training spine lands here — a missing nutrition plan or an empty
    // measurement history is a state, not a failure, and each section says so
    // itself. See isHardError() in shared/utils/query.
    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-y-5 pt-5 pb-tabbar"
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {header}
        <Surface radius="lg" className="items-center gap-2 p-6">
          <Icon name="alert-triangle" size={22} color="--danger" />
          <Text className="text-[15px] font-semibold text-foreground">
            Couldn&apos;t load your day
          </Text>
          <Text className="text-center text-[12.5px] text-muted-foreground">
            Check your connection and try again.
          </Text>
          <Pressable
            onPress={refetchAll}
            hitSlop={HIT_SLOP}
            className="mt-1 rounded-full bg-primary px-3.5 py-2 active:opacity-85"
          >
            <Text className="text-[12.5px] font-semibold text-primary-foreground">
              Try again
            </Text>
          </Pressable>
        </Surface>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-5 pt-5 pb-tabbar"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {/* Greeting — the one section that doesn't wait, so the screen has a
          header from the first frame. */}
      {header}

      {isLoading ? (
        <View className="items-center py-16">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : (
        <>
          {/* Hero streak summary */}
          <StreakHero todayCompleted={completed} todayTotal={exercises.length} />

          {/* Today's workout card */}
          <WorkoutCard
            exercises={exercises}
            meta={meta}
            done={mergedDone}
            completed={completed}
            pct={pct}
            onToggle={toggle}
            onOpenExercise={setOpen}
            onStartWorkout={
              todayDayId
                ? () => router.push(`/workout/${todayDayId}` as any)
                : undefined
            }
          />

          {/* Nutrition row — renders only when a plan covers today */}
          <NutritionTodayCards />

          {/* Check-in */}
          <CheckInCard />
        </>
      )}

      {/* Exercise Bottom Modal Drawer */}
      <ExerciseSheet
        key={open?.id}
        exercise={open}
        isDone={open ? !!mergedDone[open.id] : false}
        onClose={() => setOpen(null)}
        onDone={(id) => toggle(id)}
      />
    </ScrollView>
  );
}

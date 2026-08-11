import { useGetActivityGraphQuery } from "@/api/endpoints/activity.endpoints";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { Tone } from "@/tw/Tone";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent } from "react-native";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  buildActivityGrid,
  Cell,
  DayCellData,
  formatCellDate,
  levelFromProgress,
  todayInZone,
} from "../lib/activityGrid";
import { useStreakCelebration } from "../hooks/useStreakCelebration";

const palettes = {
  green: [
    "bg-[#ebedf0] dark:bg-white/[0.06]",
    "bg-[#9be9a8] dark:bg-[#0e4429]",
    "bg-[#40c463] dark:bg-[#006d32]",
    "bg-[#30a14e] dark:bg-[#26a641]",
    "bg-[#216e39] dark:bg-[#39d353]",
  ],
  orange: [
    "bg-[#f1ece6] dark:bg-white/[0.06]",
    "bg-[#ffd6a8] dark:bg-[#4a2410]",
    "bg-[#ffa657] dark:bg-[#7a3a10]",
    "bg-[#f0883e] dark:bg-[#d97706]",
    "bg-[#c2410c] dark:bg-[#fb923c]",
  ],
};

/** The celebration ring drawn over today's square. Plain Reanimated views take
 *  no className, and the card is always the dark `ink` tone, so white reads in
 *  both themes. */
const FLASH_RING = {
  position: "absolute" as const,
  top: -2,
  right: -2,
  bottom: -2,
  left: -2,
  borderRadius: 5,
  borderWidth: 2,
  borderColor: "#ffffff",
};

const WEEKS = 18;
const GAP = 3;
/** Left column holding the M/W/F labels. */
const GUTTER = 14;

export function StreakHero({
  todayCompleted,
  todayTotal,
}: {
  todayCompleted: number;
  todayTotal: number;
}) {
  const { accent } = useRole();
  const colors = palettes[accent];
  const accentDot = accent === "green" ? "bg-[#30a14e]" : "bg-[#f0883e]";

  // `refetchOnFocus` covers reopening the app on this screen; the focus effect
  // below covers navigating back to it. Both exist because activity can be
  // recorded on another device, where no local mutation invalidates the cache.
  const { data, isLoading, isError, refetch } = useGetActivityGraphQuery(undefined, {
    refetchOnFocus: true,
  });
  const [gridWidth, setGridWidth] = useState(0);
  const [selected, setSelected] = useState<DayCellData | null>(null);

  // The initial query already covers the first focus, so skip it — otherwise
  // every mount fires two requests for the same graph.
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!focusedOnce.current) {
        focusedOnce.current = true;
        return;
      }
      refetch();
    }, [refetch])
  );

  // The graph's day boundaries resolve in its own zone, not the device's.
  const todayIso = useMemo(() => todayInZone(data?.timezone), [data?.timezone]);
  const todayLevel = levelFromProgress(todayCompleted, todayTotal);

  const { columns, monthLabels, weekdayRows } = useMemo(
    () =>
      buildActivityGrid({
        days: data?.days ?? [],
        todayIso,
        weeks: WEEKS,
        todayLevelFloor: todayLevel,
      }),
    [data?.days, todayIso, todayLevel]
  );

  const summary = data?.summary;
  // Deliberately not gated on `isError`: the celebration is about the exercises
  // ticked on this screen, so a failed graph fetch must not swallow it.
  const { pulse, streak, streakTarget } = useStreakCelebration({
    todayIso,
    todayLevel,
    streakDays: summary?.currentStreakDays ?? 0,
    enabled: !isLoading,
  });

  // One driver per animated element. `pulse` restarts them all.
  const cellScale = useSharedValue(1);
  const flash = useSharedValue(0);
  const badge = useSharedValue(0);
  const numberPop = useSharedValue(0);
  const pill = useSharedValue(0);

  const spring = { damping: 12, stiffness: 140, mass: 0.7 };

  useEffect(() => {
    if (pulse === 0) return;
    cellScale.set(
      withSequence(withTiming(2.1, { duration: 220 }), withSpring(1, spring))
    );
    flash.set(withSequence(withTiming(1, { duration: 140 }), withTiming(0, { duration: 700 })));
    badge.set(withSequence(withTiming(1, { duration: 260 }), withSpring(0, spring)));
    numberPop.set(withSequence(withTiming(1, { duration: 240 }), withSpring(0, spring)));
    pill.set(
      withSequence(
        withTiming(1, { duration: 260 }),
        withDelay(900, withTiming(0, { duration: 320 }))
      )
    );
    // `spring` is a literal recreated each render; the values never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse, cellScale, flash, badge, numberPop, pill]);

  const todayCellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cellScale.get() }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));
  // Mirrors the streak-pop keyframe in global.css (scale / rotate), scaled up
  // a little — at 48px the original 1.15 was easy to miss.
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + badge.get() * 0.35 }, { rotate: `${badge.get() * -9}deg` }],
  }));
  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + numberPop.get() * 0.22 }],
  }));
  const pillStyle = useAnimatedStyle(() => ({
    opacity: pill.get(),
    transform: [{ translateY: (1 - pill.get()) * 10 }],
  }));

  const cellSize =
    gridWidth > 0 ? (gridWidth - GUTTER - GAP * (WEEKS - 1)) / WEEKS : 0;

  const onGridLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (Math.abs(width - gridWidth) > 0.5) setGridWidth(width);
  };

  const caption = captionFor({ selected, isError, isLoading, hasDays: (data?.days?.length ?? 0) > 0 });

  return (
    <Tone name="ink" className="rounded-2xl p-5 shadow-ink" glass>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-foreground/60">
            Activity streak
          </Text>
          <View className="mt-1 flex-row items-baseline gap-2">
            <Reanimated.View style={numberStyle}>
              <Text className="text-5xl font-black text-ink-foreground">
                {isLoading ? "-" : streak}
              </Text>
            </Reanimated.View>
            <Text className="text-base font-medium text-ink-foreground/70">
              {streak === 1 ? "day streak" : "days streak"}
            </Text>
          </View>

          {/* Absolute so the card doesn't reserve a strip of empty space for a
              pill that's invisible almost all of the time. */}
          <Reanimated.View
            style={[{ position: "absolute", top: 74, left: 0 }, pillStyle]}
            pointerEvents="none"
          >
            <View className="flex-row items-center gap-1 self-start rounded-full bg-ink-foreground/20 px-2.5 py-1">
              <Text className="text-[11.5px] font-semibold text-ink-foreground">
                {streakTarget <= 1 ? "Streak started" : `Day ${streakTarget} — keep it going`}
              </Text>
              <Icon name="flame" size={12} color="--ink-foreground" />
            </View>
          </Reanimated.View>
        </View>

        <Reanimated.View style={badgeStyle}>
          <View
            className={cn(
              "h-12 w-12 items-center justify-center rounded-2xl shadow-pop",
              accentDot
            )}
          >
            <Icon name="flame" size={24} color="#ffffff" />
          </View>
        </Reanimated.View>
      </View>

      <View className="mt-4" onLayout={onGridLayout}>
        {cellSize > 0 ? (
          <>
            {/* Month labels are absolutely positioned so a name wider than its
                column doesn't get clipped by the column's bounds. */}
            <View className="h-3.5" style={{ marginLeft: GUTTER }}>
              {monthLabels.map((m) => (
                <Text
                  key={m.col}
                  className="absolute text-[9.5px] text-ink-foreground/55"
                  style={{ left: m.col * (cellSize + GAP) }}
                >
                  {m.label}
                </Text>
              ))}
            </View>

            <View className="flex-row">
              <View style={{ width: GUTTER, gap: GAP }}>
                {Array.from({ length: 7 }, (_, row) => (
                  <View key={row} className="justify-center" style={{ height: cellSize }}>
                    <Text className="text-[8.5px] text-ink-foreground/45">
                      {weekdayRows.find((w) => w.row === row)?.label ?? ""}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="flex-row" style={{ gap: GAP }}>
                {columns.map((week, col) => (
                  <View key={col} style={{ gap: GAP }}>
                    {week.map((cell, row) => (
                      <DayCell
                        key={row}
                        cell={cell}
                        size={cellSize}
                        colors={colors}
                        selected={cell.kind === "day" && selected?.date === cell.date}
                        animatedStyle={
                          cell.kind === "day" && cell.isToday ? todayCellStyle : undefined
                        }
                        flashStyle={
                          cell.kind === "day" && cell.isToday ? flashStyle : undefined
                        }
                        onPress={setSelected}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          // Nothing is measured yet; hold the space rather than laying out twice.
          <View className="h-24" />
        )}
      </View>

      <Pressable
        className="mt-3"
        disabled={!isError}
        onPress={() => refetch()}
        accessibilityRole={isError ? "button" : undefined}
      >
        <Text className="text-[12.5px] text-ink-foreground/70">{caption}</Text>
      </Pressable>

      {summary && !isLoading ? (
        <View className="mt-3 flex-row gap-2">
          <Stat label="Longest" value={`${summary.longestStreakDays}d`} />
          <Stat label="Active days" value={String(summary.activeDays)} />
          <Stat label="Sessions" value={String(summary.totalActivities)} />
        </View>
      ) : null}

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-[10.5px] text-ink-foreground/60">{WEEKS} weeks</Text>
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[10.5px] text-ink-foreground/60">Less</Text>
          {colors.map((c, i) => (
            <View key={i} className={cn("h-2.5 w-2.5 rounded-[3px]", c)} />
          ))}
          <Text className="text-[10.5px] text-ink-foreground/60">More</Text>
        </View>
      </View>
    </Tone>
  );
}

function captionFor({
  selected,
  isError,
  isLoading,
  hasDays,
}: {
  selected: DayCellData | null;
  isError: boolean;
  isLoading: boolean;
  hasDays: boolean;
}): string {
  if (isError) return "Couldn't load your activity. Tap to retry.";
  if (isLoading) return "Loading your activity…";
  if (selected) {
    const when = formatCellDate(selected.date);
    if (selected.activityCount === 0) return `No activity · ${when}`;
    const noun = selected.activityCount === 1 ? "session" : "sessions";
    return `${selected.activityCount} ${noun} · ${when}`;
  }
  if (!hasDays) return "Log your first session to start your streak";
  return "Tap a square for that day · darker = more sessions";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-xl bg-ink-foreground/[0.07] px-2.5 py-2">
      <Text className="text-[15px] font-bold text-ink-foreground">{value}</Text>
      <Text className="text-[10px] text-ink-foreground/60">{label}</Text>
    </View>
  );
}

type AnimatedViewStyle = React.ComponentProps<typeof Reanimated.View>["style"];

interface DayCellProps {
  cell: Cell;
  size: number;
  colors: string[];
  selected: boolean;
  animatedStyle?: AnimatedViewStyle;
  flashStyle?: AnimatedViewStyle;
  onPress: (cell: DayCellData | null) => void;
}

/**
 * One square. 126 of these render per card, so it's memoized — only the tapped
 * cell, the previously tapped cell and today ever change.
 */
const DayCell = React.memo(function DayCell({
  cell,
  size,
  colors,
  selected,
  animatedStyle,
  flashStyle,
  onPress,
}: DayCellProps) {
  if (cell.kind === "pad") {
    // Tomorrow onwards isn't drawn at all, so today's square is the last one in
    // the grid and the column grows a cell at a time as the days arrive.
    if (cell.future) return null;
    // Older than the graph's range: faint, and not tappable, so it never reads
    // as a logged rest day — but it still holds its row's place.
    return (
      <View
        className={cn("rounded-[3px] opacity-40", colors[0])}
        style={{ width: size, height: size }}
      />
    );
  }

  const square = (
    <Pressable
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={`${cell.activityCount} sessions on ${formatCellDate(cell.date)}`}
      onPress={() => onPress(selected ? null : cell)}
      className={cn(
        "rounded-[3px]",
        colors[cell.level] ?? colors[0],
        cell.isToday && "border border-ink-foreground/50",
        selected && "border-2 border-ink-foreground"
      )}
      style={{ width: size, height: size }}
    >
      {flashStyle ? (
        <Reanimated.View style={[FLASH_RING, flashStyle]} pointerEvents="none" />
      ) : null}
    </Pressable>
  );

  // Only today's square is ever animated; wrapping all 126 in an animated view
  // would put every one of them on the worklet path for nothing. `zIndex` keeps
  // the enlarged square above its neighbours mid-pop instead of behind them.
  return animatedStyle ? (
    <Reanimated.View style={[{ zIndex: 1 }, animatedStyle]}>{square}</Reanimated.View>
  ) : (
    square
  );
});

import type { OverviewWeekday } from "@/api/types";
import { cn } from "@/lib/utils";
import { fillHeightClass } from "@/shared/ui/ProgressTrack";
import { withAlpha } from "@/shared/utils/color";
import { Text, View, useCSSVariable } from "@/tw";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

/** 1 = Monday … 7 = Sunday, matching the API's documented base. */
const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

interface WeekVolumeChartProps {
  /** Straight from overview.thisWeek.byDay — rendered in the order received. */
  byDay: OverviewWeekday[];
  /** Today in byDay's own base, or null when the window isn't the current week. */
  todayWeekday: number | null;
}

export function WeekVolumeChart({ byDay, todayWeekday }: WeekVolumeChartProps) {
  const lilac = useCSSVariable("--lilac") as string | undefined;
  const lilacBright = useCSSVariable("--lilac-bright") as string | undefined;

  // The API always returns seven rows including empty days, so there is no
  // gap-filling here — and no re-ordering, since the array order IS Mon→Sun.
  const max = byDay.reduce((acc, day) => (day.volume > acc ? day.volume : acc), 0);

  if (__DEV__) {
    const outOfRange = byDay.filter((day) => day.weekday < 1 || day.weekday > 7);
    if (outOfRange.length > 0) {
      console.warn(
        `[WeekVolumeChart] weekday values outside 1–7: ${outOfRange
          .map((day) => day.weekday)
          .join(", ")}. The API doc says 1 = Monday; if this is 0-based the ` +
          `weekday letters are off by one.`
      );
    }
  }

  return (
    <View className="h-26 flex-row items-end gap-1.75">
      {byDay.map((day, i) => {
        const isToday = todayWeekday !== null && day.weekday === todayWeekday;
        const letter = LETTERS[day.weekday - 1] ?? LETTERS[i] ?? "";

        return (
          <View key={`${day.weekday}-${i}`} className="flex-1 items-center justify-end gap-1.5">
            <View className="h-19.5 w-full justify-end">
              {day.volume > 0 && max > 0 ? (
                <View
                  className={cn(
                    "w-full overflow-hidden rounded-t-md rounded-b-[3px]",
                    fillHeightClass(day.volume / max)
                  )}
                >
                  <LinearGradient
                    colors={[withAlpha(lilac, 0.35), lilacBright ?? "transparent"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                </View>
              ) : (
                // A day with nothing logged is a rule, not a zero-height bar —
                // the row still has to read as a day that existed.
                <View className="h-0.75 w-full rounded-full bg-foreground/10" />
              )}
            </View>
            <Text
              className={cn(
                "text-[9.5px]",
                isToday ? "font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              {letter}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
WeekVolumeChart.displayName = "WeekVolumeChart";

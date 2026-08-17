import { cn } from "@/lib/utils";
import { fillHeightClass } from "@/shared/ui/ProgressTrack";
import { withAlpha } from "@/shared/utils/color";
import { Text, View, useCSSVariable } from "@/tw";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

import { weekdayLetter } from "../lib/format";

export interface WeekActivityDay {
  /** YYYY-MM-DD, the client's local training day. */
  date: string;
  count: number;
}

interface WeekActivityChartProps {
  /** One entry per day in the window, oldest first — rendered in order. */
  byDay: WeekActivityDay[];
  /** Today's date as YYYY-MM-DD; the matching column is emphasised. */
  today: string;
}

export function WeekActivityChart({ byDay, today }: WeekActivityChartProps) {
  const lilac = useCSSVariable("--lilac") as string | undefined;
  const lilacBright = useCSSVariable("--lilac-bright") as string | undefined;

  // Bars are scaled against the busiest day, so a quiet week still reads as a
  // shape rather than seven stubs.
  const max = byDay.reduce((acc, day) => (day.count > acc ? day.count : acc), 0);

  return (
    <View className="h-26 flex-row items-end gap-1.75">
      {byDay.map((day) => {
        // The window rolls, so the last column is today and the letters start
        // on whatever weekday is six days back — they're read off each date
        // rather than assumed to run Monday-first.
        const isToday = day.date === today;

        return (
          <View key={day.date} className="flex-1 items-center justify-end gap-1.5">
            <View className="h-19.5 w-full justify-end">
              {day.count > 0 && max > 0 ? (
                <View
                  className={cn(
                    "w-full overflow-hidden rounded-t-md rounded-b-[3px]",
                    fillHeightClass(day.count / max)
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
              {weekdayLetter(day.date)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
WeekActivityChart.displayName = "WeekActivityChart";

import { cn } from "@/lib/utils";
import { fillHeightClass } from "@/shared/ui/ProgressTrack";
import { withAlpha } from "@/shared/utils/color";
import { Text, View, useCSSVariable } from "@/tw";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

/** 1 = Monday … 7 = Sunday. */
const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export interface WeekActivityDay {
  /** 1 = Monday … 7 = Sunday. */
  weekday: number;
  count: number;
}

interface WeekActivityChartProps {
  /** Seven entries, Monday first — rendered in the order received. */
  byDay: WeekActivityDay[];
  /** Today's Monday-based weekday, or null when the window isn't this week. */
  todayWeekday: number | null;
}

export function WeekActivityChart({ byDay, todayWeekday }: WeekActivityChartProps) {
  const lilac = useCSSVariable("--lilac") as string | undefined;
  const lilacBright = useCSSVariable("--lilac-bright") as string | undefined;

  // Bars are scaled against the busiest day, so a quiet week still reads as a
  // shape rather than seven stubs.
  const max = byDay.reduce((acc, day) => (day.count > acc ? day.count : acc), 0);

  return (
    <View className="h-26 flex-row items-end gap-1.75">
      {byDay.map((day, i) => {
        const isToday = todayWeekday !== null && day.weekday === todayWeekday;
        const letter = LETTERS[day.weekday - 1] ?? LETTERS[i] ?? "";

        return (
          <View key={day.weekday} className="flex-1 items-center justify-end gap-1.5">
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
              {letter}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
WeekActivityChart.displayName = "WeekActivityChart";

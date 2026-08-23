import { cn } from "@/lib/utils";
import { Pressable, Text, View } from "@/tw";

import { parseLocalDate, type ActivityDaySection } from "../lib/groupByDay";

/**
 * The chips share the row, so each extra day makes all of them narrower. Seven
 * is where a chip still fits "SAT / 15 / 4" on the narrowest phone; past that
 * the rail would be a row of unreadable slivers. The days beyond the cap are
 * still in the feed — they're reached by scrolling, not by jumping, which is
 * the honest trade rather than shrinking every chip to fit them all.
 */
const MAX_CHIPS = 7;

interface DayStripProps {
  sections: ActivityDaySection[];
  /** The day currently at the top of the feed. */
  activeDate: string | null;
  onSelect: (date: string) => void;
}

/**
 * The day rail above the feed. One chip per day the feed actually returned —
 * never a fixed Mon–Sun week, because a chip for a day with nothing in it has
 * nowhere to jump to and just reads as a dead control.
 *
 * Newest first, matching the feed below it: left-to-right here is top-to-bottom
 * there, so the rail and the list never disagree about which way time runs.
 *
 * The chips divide the row evenly rather than scrolling, so the rail reads as
 * one control instead of a list that might continue off-screen. That only works
 * while the day count is small — see MAX_CHIPS.
 */
export function DayStrip({ sections, activeDate, onSelect }: DayStripProps) {
  return (
    <View className="flex-row gap-2 px-5">
      {sections.slice(0, MAX_CHIPS).map((section) => {
        const active = section.date === activeDate;
        const parsed = parseLocalDate(section.date);

        return (
          <Pressable
            key={section.date}
            onPress={() => onSelect(section.date)}
            accessibilityRole="button"
            accessibilityLabel={`${section.label}, ${section.rows.length} ${
              section.rows.length === 1 ? "activity" : "activities"
            }`}
            accessibilityState={{ selected: active }}
            className={cn(
              "flex-1 items-center gap-0.5 rounded-[14px] border py-2 active:opacity-80",
              active ? "border-primary bg-primary/10" : "border-border"
            )}
          >
            <Text
              className={cn(
                "text-[9.5px] font-semibold uppercase tracking-[0.08em]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              {parsed?.toLocaleDateString(undefined, { weekday: "short" }) ?? "—"}
            </Text>
            <Text
              className={cn(
                "text-[15px] font-bold leading-none",
                active ? "text-primary" : "text-foreground"
              )}
            >
              {parsed?.getDate() ?? "—"}
            </Text>
            {/* The count is the reason to tap one day over another, so it's on
                the chip rather than only in the heading below. */}
            <View
              className={cn(
                "mt-0.5 rounded-full px-1.5",
                active ? "bg-primary/15" : "bg-foreground/6"
              )}
            >
              <Text
                className={cn(
                  "text-[9.5px] font-semibold",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {section.rows.length}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
DayStrip.displayName = "DayStrip";

import type { StrengthSeries } from "@/api/types";
import { cn } from "@/lib/utils";
import { Surface } from "@/shared/ui/Surface";
import { formatPctShort } from "@/shared/utils/pct";
import { Text, View } from "@/tw";

interface StrengthProgressCardProps {
  /** Most-trained exercise first — rendered in the order received. */
  strength: StrengthSeries[];
}

/** How many exercises fit before the card stops being scannable. */
const MAX_ROWS = 6;

/**
 * The API sends the logger's own casing ("barbell Bench Press"), which reads as
 * a typo next to the rest of the UI. Title-cased on display only — the value is
 * the grouping key and must not be rewritten anywhere it's compared.
 */
function titleCase(name: string): string {
  return name.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

/** Trailing zeros are noise on a lift: 62.5 kg, not 62.50 kg. */
function formatKg(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Estimated 1RM per exercise, from /analytics/clients/{id}/progress.
 *
 * Epley estimate (weight × (1 + reps / 30)), best set per exercise per day —
 * so the axis is "est. 1RM", never a true max. Capped at 12 reps, and bodyweight
 * and timed work are excluded entirely: an exercise missing from this list is by
 * design, not a gap in the data.
 */
export function StrengthProgressCard({ strength }: StrengthProgressCardProps) {
  const rows = strength.slice(0, MAX_ROWS);

  return (
    <Surface radius="lg" className="gap-3 p-3.75">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Strength
        </Text>
        <Text className="text-[10.5px] text-muted-foreground">est. 1RM</Text>
      </View>

      {rows.length === 0 ? (
        <Text className="text-[13px] text-muted-foreground">
          No comparable lifts yet — bodyweight and timed work aren&apos;t estimated.
        </Text>
      ) : (
        rows.map((series, i) => (
          <View
            key={series.exerciseName}
            className={cn(
              "flex-row items-center gap-3",
              i > 0 && "border-t border-border/40 pt-3"
            )}
          >
            <View className="min-w-0 flex-1">
              <Text className="text-[14px] font-semibold text-foreground" numberOfLines={1}>
                {titleCase(series.exerciseName)}
              </Text>
              <Text className="mt-0.5 text-[12px] text-muted-foreground">
                {series.points.length === 1
                  ? "1 session"
                  : `${series.points.length} sessions`}
                {series.bestE1rmKg > series.latestE1rmKg
                  ? ` · best ${formatKg(series.bestE1rmKg)} kg`
                  : ""}
              </Text>
            </View>

            <Text className="shrink-0 text-[15px] font-semibold text-foreground">
              {formatKg(series.latestE1rmKg)}
              <Text className="text-[12px] font-normal text-muted-foreground"> kg</Text>
            </Text>

            {/* Hidden when null — a single training day in the window has no
                change to report, and "0%" would claim it stalled. */}
            {series.changePct !== null ? (
              <View
                className={cn(
                  "shrink-0 rounded-[12px] px-2 py-0.5",
                  series.changePct >= 0 ? "bg-success/12" : "bg-danger/12"
                )}
              >
                <Text
                  className={cn(
                    "text-[11px] font-semibold",
                    series.changePct >= 0 ? "text-success" : "text-danger"
                  )}
                >
                  {series.changePct > 0 ? "+" : ""}
                  {formatPctShort(series.changePct)}
                </Text>
              </View>
            ) : null}
          </View>
        ))
      )}

      {strength.length > MAX_ROWS ? (
        <Text className="text-[11px] text-muted-foreground">
          +{strength.length - MAX_ROWS} more{" "}
          {strength.length - MAX_ROWS === 1 ? "exercise" : "exercises"}
        </Text>
      ) : null}
    </Surface>
  );
}
StrengthProgressCard.displayName = "StrengthProgressCard";

import type { Measurement } from "@/api/types";
import { formatMetric, METRICS, metricValue } from "@/features/shared/measurements/metrics";
import { cn } from "@/lib/utils";
import { Text, View } from "@/tw";

/** How many metric chips fit on a row before it stops being scannable. */
const MAX_CHIPS = 3;

interface CheckinEntryRowProps {
  entry: Measurement;
  /** The check-in before this one, for the deltas. Absent on the oldest. */
  previous?: Measurement;
  /** The newest entry gets the "Latest" marker. */
  latest: boolean;
  divided: boolean;
}

function formatDate(iso: string): string {
  const parts = iso.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return iso;
  const date = new Date(parts[0], parts[1] - 1, parts[2], 12);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysBetween(a: string, b: string): number | null {
  const toDate = (iso: string) => {
    const parts = iso.slice(0, 10).split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 12);
  };
  const first = toDate(a);
  const second = toDate(b);
  if (!first || !second) return null;
  return Math.round((first.getTime() - second.getTime()) / 86_400_000);
}

export function CheckinEntryRow({ entry, previous, latest, divided }: CheckinEntryRowProps) {
  // Only metrics this check-in actually recorded — a blank field is a gap, not
  // a zero, so it simply doesn't get a chip.
  const chips = METRICS.map((meta) => {
    const value = metricValue(entry, meta.key);
    if (value === undefined) return null;
    const before = metricValue(previous, meta.key);
    const delta = before === undefined ? null : value - before;
    return { meta, value, delta };
  })
    .filter((chip): chip is NonNullable<typeof chip> => chip !== null)
    .slice(0, MAX_CHIPS);

  const gap = previous ? daysBetween(entry.measuredAt, previous.measuredAt) : null;

  return (
    <View className={cn("gap-2 px-3.5 py-3.5", divided && "border-t border-border")}>
      <View className="flex-row items-center gap-2">
        <Text className="text-[14px] font-semibold text-foreground">
          {formatDate(entry.measuredAt)}
        </Text>
        {latest ? (
          <View className="rounded-full bg-success/12 px-2 py-0.5">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.08em] text-success">
              Latest
            </Text>
          </View>
        ) : null}
        <View className="flex-1" />
        {gap !== null ? (
          <Text className="text-[11.5px] text-muted-foreground">
            {gap === 0 ? "same day" : `+${gap}d`}
          </Text>
        ) : (
          <Text className="text-[11.5px] text-muted-foreground">first</Text>
        )}
      </View>

      {chips.length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5">
          {chips.map(({ meta, value, delta }) => {
            // No previous reading means no trend — a chip that said "0" would
            // claim the client held steady when nothing was compared.
            const improving = delta === null || delta === 0 ? null : meta.lowerIsBetter ? delta < 0 : delta > 0;
            return (
              <View
                key={meta.key}
                className="flex-row items-baseline gap-1 rounded-full bg-foreground/5 px-2.5 py-1"
              >
                <Text className="text-[12px] font-semibold text-foreground">
                  {formatMetric(value)}
                  <Text className="text-[10.5px] font-normal text-muted-foreground">
                    {" "}
                    {meta.unit}
                  </Text>
                </Text>
                {delta !== null && delta !== 0 ? (
                  <Text
                    className={cn(
                      "text-[11px] font-semibold",
                      improving ? "text-success" : "text-danger"
                    )}
                  >
                    {delta > 0 ? "+" : "−"}
                    {formatMetric(Math.abs(delta))}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <Text className="text-xs text-muted-foreground">No metrics recorded</Text>
      )}
    </View>
  );
}
CheckinEntryRow.displayName = "CheckinEntryRow";

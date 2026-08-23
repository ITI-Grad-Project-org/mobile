import { useListMeasurementsQuery } from "@/api/endpoints/measurements.endpoints";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Card } from "@/shared/ui/Card";
import { Pressable, Text, View } from "@/tw";
import { router } from "expo-router";
import {
  deriveMeasurementStats,
  MEASUREMENT_HISTORY_LIMIT,
} from "../lib/measurements";

const CADENCE_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days from today to `iso`, in local time. Negative means overdue. */
function daysUntil(iso: string): number | null {
  const parts = iso.split("T")[0].split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

function addDays(iso: string, days: number): Date | null {
  const parts = iso.split("T")[0].split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2] + days);
}

function toIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The check-in prompt on Today: when the next measurement check-in is due, and a
 * shortcut into the measurement form.
 */
export function CheckInCard() {
  const { tenantId } = useActiveTenant();

  const { data, isLoading } = useListMeasurementsQuery(
    { tenantId: tenantId ?? "", limit: MEASUREMENT_HISTORY_LIMIT },
    { skip: !tenantId }
  );

  // Stay out of the way until the answer is known — a card that flips from
  // "first check-in" to "due Sunday" a beat later reads as a glitch.
  if (isLoading || !tenantId) return null;

  const stats = deriveMeasurementStats(data);
  const open = () => router.push("/(client)/measurement");

  let label: string;
  let headline: string;
  let action: string;

  if (!stats.hasData || !stats.latest) {
    label = "First check-in";
    headline = "Not logged yet";
    action = "Start";
  } else {
    const dueDate = addDays(stats.latest.measuredAt, CADENCE_DAYS);
    const remaining = dueDate ? daysUntil(toIso(dueDate)) : null;

    label = "Next check-in";
    action = "Prepare";

    if (remaining === null) {
      headline = "Due soon";
    } else if (remaining < 0) {
      const overdue = Math.abs(remaining);
      headline = `Overdue by ${overdue} day${overdue === 1 ? "" : "s"}`;
      action = "Log now";
    } else if (remaining === 0) {
      headline = "Due today";
      action = "Log now";
    } else if (remaining === 1) {
      headline = "Tomorrow";
    } else if (remaining <= 6 && dueDate) {
      headline = dueDate.toLocaleDateString("en-US", { weekday: "long" });
    } else {
      headline = `In ${remaining} days`;
    }
  }

  return (
    <Card tone="lilac" interactive glass onPress={open}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lilac-ink opacity-70">
            {label}
          </Text>
          <Text className="mt-1 text-[18px] font-bold text-lilac-ink">{headline}</Text>
          <Text className="text-[12px] text-lilac-ink opacity-80">
            Photos + weight + waist
          </Text>
        </View>

        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`${action} your check-in`}
          className="shrink-0 rounded-full bg-lilac-ink px-4 py-2 active:opacity-80"
        >
          <Text className="text-[12px] font-semibold text-lilac">{action}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

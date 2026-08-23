import { useGetAnalyticsActivityQuery } from "@/api/endpoints/analytics.endpoints";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { useMemo } from "react";

import type { WeekActivityDay } from "../components/WeekActivityChart";
import { rollingDates, rollingRange, type WeekRange } from "../lib/format";
import { toActivityRows } from "../lib/normalizeActivity";

/** The endpoint's ceiling; it rejects anything higher rather than clamping. */
const MAX_ROWS = 200;
const WINDOW_DAYS = 7;

export interface WeekActivity {
  /** Always seven entries, oldest first; the last is today. */
  byDay: WeekActivityDay[];
  total: number;
  /** null when the previous window's request hasn't resolved. */
  previousTotal: number | null;
  /** Percentage change vs the previous 7 days; null with no basis to compare. */
  changePct: number | null;
  /** The window the counts describe. */
  range: WeekRange;
  /**
   * True when a window hit the row ceiling, so its total is a floor, not a
   * count. The card has to say so rather than quietly under-reporting.
   */
  capped: boolean;
  isLoading: boolean;
}

export function useWeekActivity(): WeekActivity {
  const { tenantId } = useActiveTenant();
  const skip = { skip: !tenantId };
  const arg = { tenantId: tenantId ?? "" };

  const dates = useMemo(() => rollingDates(0, WINDOW_DAYS), []);
  const current = useMemo(() => rollingRange(0, WINDOW_DAYS), []);
  const previous = useMemo(() => rollingRange(WINDOW_DAYS, WINDOW_DAYS), []);

  const currentQuery = useGetAnalyticsActivityQuery({ ...arg, ...current, limit: MAX_ROWS }, skip);
  // Only for the delta — a count, never rendered as rows.
  const previousQuery = useGetAnalyticsActivityQuery({ ...arg, ...previous, limit: MAX_ROWS }, skip);

  const currentData = currentQuery.data;
  const previousData = previousQuery.data;

  return useMemo(() => {
    const rows = toActivityRows(currentData);
    const previousRows = previousData ? toActivityRows(previousData) : null;

    const counts = new Map<string, number>(dates.map((date) => [date, 0]));
    for (const row of rows) {
      // The row's own training date drives the bucket; fall back to the logged
      // instant only when the payload carried no training date. Both are sliced
      // to a calendar date — occurredAt is a full timestamp.
      const date = (row.trainingDate ?? row.loggedAt)?.slice(0, 10);
      if (!date) continue;
      // A row outside the window (a late log for an older training day) still
      // counts toward the total, but has no column to land in.
      const bucket = counts.get(date);
      if (bucket === undefined) continue;
      counts.set(date, bucket + 1);
    }
    const byDay = dates.map((date) => ({ date, count: counts.get(date) ?? 0 }));

    const total = rows.length;
    const previousTotal = previousRows ? previousRows.length : null;
    const capped = total >= MAX_ROWS || (previousTotal ?? 0) >= MAX_ROWS;

    // A zero baseline has no percentage — "+∞%" is not a change, it's a start.
    // Capped windows can't be compared either: both sides would be floors.
    const changePct =
      previousTotal === null || previousTotal === 0 || capped
        ? null
        : ((total - previousTotal) / previousTotal) * 100;

    return {
      byDay,
      total,
      previousTotal,
      changePct,
      range: current,
      capped,
      isLoading: !tenantId || currentQuery.isLoading,
    };
  }, [currentData, currentQuery.isLoading, previousData, dates, current, tenantId]);
}

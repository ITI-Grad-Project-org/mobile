import type { CheckinAwaitingReview } from "@/api/types";
import {
  isoDaysAgo,
  useRosterMeasurements,
  type RosterClient,
} from "@/features/coach/checkins/hooks/useRosterMeasurements";
import { useMemo } from "react";

/** How far back a measurement still counts as something to look at. */
export const CHECKIN_WINDOW_DAYS = 14;

export type { RosterClient };

/** Stable identity, so an empty result doesn't re-trigger downstream memos. */
const NONE: CheckinAwaitingReview[] = [];

export function useRosterCheckins(clients: RosterClient[], enabled: boolean) {
  // One row per client is all the queue needs — it shows a count and the
  // longest-waiting name.
  const from = useMemo(() => isoDaysAgo(CHECKIN_WINDOW_DAYS), []);
  const { data } = useRosterMeasurements(clients, { enabled, from, limit: 1 });

  return useMemo(() => {
    const rows: CheckinAwaitingReview[] = [];

    for (const entry of data) {
      const measurement = entry.measurements[0];
      if (!measurement) continue;
      rows.push({
        checkinId: measurement.id ?? `${entry.client.clientId}-checkin`,
        membershipId: entry.client.membershipId,
        clientName: entry.client.name,
        submittedAt: measurement.measuredAt,
      });
    }

    // Oldest first, matching how the analytics queue arrives — the row shows
    // the one that has been waiting longest.
    rows.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    return rows.length > 0 ? rows : NONE;
  }, [data]);
}

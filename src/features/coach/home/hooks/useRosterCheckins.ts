import type { CheckinAwaitingReview } from "@/api/types";
import { useCheckinReviews } from "@/features/coach/checkins/hooks/useCheckinReviews";
import { isoDaysAgo, type RosterClient } from "@/features/coach/checkins/hooks/useRosterMeasurements";
import { useMemo } from "react";

/** How far back a measurement still counts as something to look at. */
export const CHECKIN_WINDOW_DAYS = 14;

export type { RosterClient };

/** Stable identity, so an empty result doesn't re-trigger downstream memos. */
const NONE: CheckinAwaitingReview[] = [];

export interface RosterCheckins {
  /** Unreviewed check-ins in the window, oldest first. */
  checkins: CheckinAwaitingReview[];
  /** False until the queue has loaded — `checkins` is not yet meaningful. */
  hydrated: boolean;
  /** Re-reads the queue, for the screen's pull-to-refresh. */
  refetch: () => void;
}

/**
 * THE check-in queue for Home: what is actually still unreviewed.
 *
 * Comes from GET /measurements/reviews/pending — one request for the whole
 * tenant, where this used to fan out /client/{id}/measurements across the
 * roster. A pending row names its own client, so the roster is consulted only
 * for the membershipId that row omits.
 *
 * This replaces /analytics/attention's own checkinsAwaitingReview rather than
 * backing it up. Analytics reports on a check-in entity that knows nothing
 * about `reviewedAt`, so it goes on claiming a review is due long after one
 * happened — see analytics-checkins in HomeScreen.
 */
export function useRosterCheckins(clients: RosterClient[]): RosterCheckins {
  const reviews = useCheckinReviews();
  const cutoff = useMemo(() => isoDaysAgo(CHECKIN_WINDOW_DAYS), []);

  const checkins = useMemo(() => {
    // Keyed by the client's USER id: a pending row nests `client` and carries
    // no membershipId (see PendingMeasurement — the two measurement reads use
    // different serializers). The roster is consulted only for the membership,
    // which the row itself can't supply.
    const byUserId = new Map(clients.map((client) => [client.clientId, client]));
    const rows: CheckinAwaitingReview[] = [];

    for (const measurement of reviews.pending) {
      // Older than the window is a backlog for the Check-ins tab, not something
      // Home should still be asking about.
      if (measurement.measuredAt < cutoff) continue;

      const rosterEntry = measurement.client?.id
        ? byUserId.get(measurement.client.id)
        : undefined;
      const nested = [measurement.client?.firstName, measurement.client?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      // The row names its own client, so a cold roster can't empty the queue.
      const clientName = nested || rosterEntry?.name;
      if (!clientName) continue;

      rows.push({
        checkinId: measurement.id,
        // Only the deep link wants this, and the check-ins row opens the
        // Check-ins tab rather than a client — so an unresolved membership
        // costs nothing and is never a reason to drop the row.
        membershipId: measurement.membershipId ?? rosterEntry?.membershipId ?? "",
        clientName,
        submittedAt: measurement.measuredAt,
      });
    }

    // Oldest first, matching how the analytics queue arrives — the row shows
    // the one that has been waiting longest.
    rows.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    return rows.length > 0 ? rows : NONE;
  }, [clients, reviews.pending, cutoff]);

  return { checkins, hydrated: reviews.hydrated, refetch: reviews.refetch };
}

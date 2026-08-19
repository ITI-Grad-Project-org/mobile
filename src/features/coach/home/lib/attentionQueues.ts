import type { Attention, CheckinAwaitingReview } from "@/api/types";
import type { IconName } from "@/shared/ui/Icon";

import {
  DASH,
  DEFAULT_ENDING_HORIZON_DAYS,
  DEFAULT_RISK_THRESHOLD_DAYS,
  daysSince,
  formatPctShort,
  silenceHeadline,
  silenceLength,
  formatShortDate,
  pluralise,
} from "./format";

export type QueueKey = "atRisk" | "checkins" | "ending";

export interface AttentionRowModel {
  key: QueueKey;
  tone: "danger" | "neutral";
  /**
   * The row's tint, as a CSS variable NAME — one per queue so the three read
   * apart at a glance while every row still fades to --card.
   */
  fromVar: string;
  /** Danger rows show a glyph; the neutral ones show the queue size. */
  icon?: IconName;
  count?: number;
  bubbleClassName: string;
  bubbleTextClassName?: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  /** The leading item's membership, for resolving the deep link. */
  membershipId?: string;
}

export interface CollapsedLine {
  key: QueueKey;
  label: string;
}

export interface BuildQueuesOptions {
  /**
   * Check-ins derived from measurements, used only when the analytics queue is
   * empty. See useRosterCheckins for why this exists.
   */
  fallbackCheckins?: CheckinAwaitingReview[];
}

export interface QueueModel {
  /** True when the check-ins row came from measurements, which changes its copy. */
  usedFallbackCheckins: boolean;
  /** Non-empty queues, in the API's order. The first gets the filled pill. */
  rows: AttentionRowModel[];
  /** Empty queues as one-line reassurances, suppressed entirely when allClear. */
  collapsed: CollapsedLine[];
  /** Every queue empty — the whole block becomes a single all-clear row. */
  allClear: boolean;
}

export function buildQueues(
  attention: Attention | undefined,
  options: BuildQueuesOptions = {}
): QueueModel {
  if (!attention) {
    return { rows: [], collapsed: [], allClear: false, usedFallbackCheckins: false };
  }

  const rows: AttentionRowModel[] = [];
  const collapsed: CollapsedLine[] = [];

  const atRisk = attention.atRisk ?? [];
  const ending = attention.programsEndingSoon ?? [];

  // The analytics queue wins when it has anything; measurements only fill the
  // gap left by the missing check-in resource.
  const analyticsCheckins = attention.checkinsAwaitingReview ?? [];
  const fallbackCheckins = options.fallbackCheckins ?? [];
  const usedFallbackCheckins = analyticsCheckins.length === 0 && fallbackCheckins.length > 0;
  const checkins = usedFallbackCheckins ? fallbackCheckins : analyticsCheckins;

  if (atRisk.length > 0) {
    const worst = atRisk[0];
    const others = atRisk.length - 1;

    // neverActive counts from the join date, not from a last activity, so
    // "gone quiet 9 days" would be a lie about someone who never started —
    // and an unknown count drops the number entirely rather than saying 0.
    const lead = `${worst.clientName} ${silenceHeadline(worst)}`;
    const joinedAgo = silenceLength(worst.daysSilent);

    rows.push({
      key: "atRisk",
      tone: "danger",
      fromVar: "--danger-tint",
      icon: "alert-triangle",
      bubbleClassName: "bg-danger/15",
      title:
        others > 0
          ? `${worst.clientName} and ${others} ${pluralise(others, "other")} have gone quiet`
          : lead,
      subtitle: worst.neverActive
        ? joinedAgo
          ? `Joined ${joinedAgo} ago · nothing logged yet`
          : "Nothing logged since joining"
        : `Attrition risk · silent past ${DEFAULT_RISK_THRESHOLD_DAYS} days`,
      actionLabel: "Reach out",
      membershipId: worst.membershipId,
    });
  } else {
    collapsed.push({ key: "atRisk", label: "Nobody has gone quiet" });
  }

  if (checkins.length > 0) {
    const oldest = checkins[0];
    const waiting = daysSince(oldest.submittedAt);
    rows.push({
      key: "checkins",
      tone: "neutral",
      fromVar: "--info-tint",
      count: checkins.length,
      bubbleClassName: "bg-info-tint",
      bubbleTextClassName: "text-info",
      // Both queues are filtered by the coach's own review state before they
      // get here (see useRosterCheckins / HomeScreen), so a derived row can
      // claim the check-in is still unreviewed rather than only that it
      // happened — the server flag it lacks is no longer what decides this.
      title: `${checkins.length} ${pluralise(checkins.length, "check-in")} to review`,
      subtitle:
        waiting === null
          ? oldest.clientName
          : `${oldest.clientName} · oldest waiting ${waiting} ${pluralise(waiting, "day")}`,
      actionLabel: "Review",
      membershipId: oldest.membershipId,
    });
  } else {
    collapsed.push({ key: "checkins", label: "No recent check-ins" });
  }

  if (ending.length > 0) {
    const soonest = ending[0];
    rows.push({
      key: "ending",
      tone: "neutral",
      // The lilac family's tint — the same one the insight card fades from.
      fromVar: "--indigo-tint",
      count: ending.length,
      bubbleClassName: "bg-lilac/20",
      bubbleTextClassName: "text-lilac-ink",
      title: `${ending.length} ${pluralise(ending.length, "program")} ending soon`,
      // completionPct covers the whole run, not the window — it's the signal
      // for what to write next, so it belongs on the row.
      subtitle: `${soonest.clientName} ${formatShortDate(soonest.endsOn)} · ${
        soonest.completionPct === null ? DASH : formatPctShort(soonest.completionPct)
      } done`,
      actionLabel: "Renew",
      membershipId: soonest.membershipId,
    });
  } else {
    collapsed.push({
      key: "ending",
      label: `Nothing ending in the next ${DEFAULT_ENDING_HORIZON_DAYS} days`,
    });
  }

  const allClear = rows.length === 0;
  return { rows, collapsed: allClear ? [] : collapsed, allClear, usedFallbackCheckins };
}

export interface InsightModel {
  /** Stable per subject, so dismissing one insight doesn't suppress the next. */
  key: string;
  body: string;
  membershipId?: string;
}

/**
 * The insight line, templated from the attention queues. There is no assistant
 * endpoint (v1 excludes agentic AI), so this states a number the API actually
 * returned rather than inventing a claim about a named client.
 */
/** The insight line for the worst at-risk row. Split out because every branch
 *  has to survive an unknown day count without inventing "0 days". */
function buildAtRiskInsightBody(worst: Attention["atRisk"][number]): string {
  const length = silenceLength(worst.daysSilent);
  if (worst.neverActive) {
    const joined = length ? `joined ${length} ago and ` : "";
    return `${worst.clientName} ${joined}still hasn't logged anything. A first message is usually what starts them.`;
  }
  const silence = length
    ? `has been silent ${length} — the longest on your roster`
    : "has gone quiet — the longest silence on your roster";
  return `${worst.clientName} ${silence}. Worth reaching out before it becomes a cancellation.`;
}

export function buildInsight(attention: Attention | undefined): InsightModel | null {
  if (!attention) return null;

  const worst = attention.atRisk?.[0];
  if (worst) {
    return {
      key: `atRisk:${worst.membershipId}`,
      membershipId: worst.membershipId,
      body: buildAtRiskInsightBody(worst),
    };
  }

  const oldest = attention.checkinsAwaitingReview?.[0];
  if (oldest) {
    const waiting = daysSince(oldest.submittedAt);
    const count = attention.checkinsAwaitingReview.length;
    return {
      key: `checkins:${oldest.checkinId}`,
      membershipId: oldest.membershipId,
      body:
        waiting === null
          ? `${count} ${pluralise(count, "check-in")} are waiting on your review.`
          : `${count} ${pluralise(count, "check-in")} waiting on your review — the oldest has been sitting ${waiting} ${pluralise(waiting, "day")}.`,
    };
  }

  return null;
}

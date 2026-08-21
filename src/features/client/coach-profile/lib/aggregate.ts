import type { Review, ReviewSummary } from "@/api/types";

export interface CoachRating {
  /** null whenever there is no real rating — NEVER 0. */
  average: number | null;
  count: number;
}

function isUsableRating(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * The coach's rating, WITH the requesting client's own review folded in.
 *
 * The bug this exists to fix: the public aggregate came back without the
 * requester's own review, so a client who had just left 5 stars still saw the
 * header say "no ratings yet" until some later refetch happened to pick it up.
 *
 * Membership is decided by the public LIST, not by the summary's count: the
 * list is the only place we can actually look for the review's id. When the
 * list doesn't contain it, the summary almost certainly excluded it too, so
 * both the count and the mean get it added. When the list does contain it, the
 * server already counted it and nothing is added.
 *
 * The summary's own count is still preferred over the list length, because the
 * list is the thing likelier to be capped.
 */
export function resolveCoachRating(
  summary: ReviewSummary | undefined,
  publicReviews: readonly Review[],
  myReview: Review | null | undefined
): CoachRating {
  const ownId = myReview?.id;
  const ownInList = ownId != null && publicReviews.some((review) => review.id === ownId);
  const ownIsExtra = myReview != null && !ownInList;
  const ownRating = Number(myReview?.rating);

  const reportedCount = summary?.totalReviews ?? summary?.count;
  const reportedAverage = summary?.averageRating ?? summary?.average;

  const baseCount = typeof reportedCount === "number" ? reportedCount : publicReviews.length;
  const count = baseCount + (ownIsExtra ? 1 : 0);

  if (count === 0) return { average: null, count: 0 };

  // Preferred path: re-weight the server's mean by its own count, then add the
  // one rating it left out.
  if (typeof reportedAverage === "number" && !Number.isNaN(reportedAverage)) {
    if (!ownIsExtra) return { average: reportedAverage, count };
    if (isUsableRating(ownRating) && typeof reportedCount === "number") {
      const sum = reportedAverage * reportedCount + ownRating;
      return { average: sum / count, count };
    }
  }

  // Fallback: derive the mean from every rating we can actually see. Rows with
  // no usable rating are left out entirely rather than counted as zero, which
  // would drag the number down for a field that simply didn't arrive.
  const ratings = publicReviews.map((review) => Number(review.rating)).filter(isUsableRating);
  if (ownIsExtra && isUsableRating(ownRating)) ratings.push(ownRating);

  if (ratings.length === 0) return { average: null, count };
  return {
    average: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
    count,
  };
}

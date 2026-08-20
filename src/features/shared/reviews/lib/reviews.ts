import type { Review, ReviewSummary } from "@/api/types";

export function reviewAuthorName(review: Review): string {
  const fromClient = `${review.client?.firstName || ""} ${review.client?.lastName || ""}`.trim();
  return review.clientName || fromClient || "Client";
}

export function reviewAvatarUrl(review: Review): string | undefined {
  return review.clientAvatarUrl || review.client?.avatarUrl;
}

export function formatReviewDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** A rating, as the payload may or may not have sent it. */
interface Rated {
  rating?: number | null;
}

/**
 * The summary payload isn't documented — accept either naming and fall back to
 * deriving the average from the list we already have.
 *
 * Rows with no usable rating are left out of the derived average entirely
 * rather than counted as zero, which would drag the number down for a field
 * that simply didn't arrive.
 */
export function resolveSummary(
  summary: ReviewSummary | undefined,
  reviews: readonly Rated[]
): { average: number | null; total: number } {
  const total = summary?.totalReviews ?? summary?.count ?? reviews.length;

  const reported = summary?.averageRating ?? summary?.average;
  if (typeof reported === "number" && !Number.isNaN(reported)) {
    return { average: reported, total };
  }

  const rated = reviews
    .map((r) => Number(r.rating))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (rated.length === 0) return { average: null, total };
  return { average: rated.reduce((sum, n) => sum + n, 0) / rated.length, total };
}

import type { Review, ReviewSummary } from "@/api/types";

export function reviewAuthorName(review: Review): string {
  const fromClient = `${review.client?.firstName || ""} ${review.client?.lastName || ""}`.trim();
  return review.clientName || fromClient || "Client";
}

export function reviewAvatarUrl(review: Review): string | undefined {
  return review.clientAvatarUrl || review.client?.avatarUrl;
}

export function formatReviewDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * The summary payload isn't documented — accept either naming and fall back to
 * deriving the average from the list we already have.
 */
export function resolveSummary(
  summary: ReviewSummary | undefined,
  reviews: Review[]
): { average: number | null; total: number } {
  const total = summary?.totalReviews ?? summary?.count ?? reviews.length;

  const reported = summary?.averageRating ?? summary?.average;
  if (typeof reported === "number" && !Number.isNaN(reported)) {
    return { average: reported, total };
  }

  if (reviews.length === 0) return { average: null, total };
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  return { average: sum / reviews.length, total };
}

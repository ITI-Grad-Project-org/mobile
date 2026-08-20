/**
 * A review, after the tolerant read.
 *
 * `/reviews/me` has no response schema in Swagger (only "Reviews retrieved"),
 * so every field here is what normalizeReviews could actually find rather than
 * what the payload promises. Anything unknown is null, never a substituted
 * zero — a review rendered as 0 stars would be a missing field pretending to
 * be a rating.
 */
export interface CoachReview {
  /** Falls back to the row's index when the payload carries no id. */
  id: string;
  /** 1–5, or null when the payload sent nothing parseable. */
  rating: number | null;
  comment: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  /**
   * When the review was last written — an edit counts as new again, so this
   * is what recency and the "new" watermark are both measured from.
   */
  writtenAt: string | null;
  clientName: string;
  clientAvatarUrl?: string;
  /**
   * The reviewer's USER id when the payload carries one. Only the chat deep
   * link wants it, so a review without it still renders — it just isn't
   * tappable.
   */
  clientUserId?: string;
}

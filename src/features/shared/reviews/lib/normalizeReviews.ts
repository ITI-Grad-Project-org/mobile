import { asRecord, nameFrom, pick, pickList, pickNumber } from "@/shared/utils/analyticsPayload";

import type { CoachReview } from "../types";

/**
 * The coach's own reviews, made shape-tolerant.
 *
 * Same problem as the analytics payloads: `/reviews/me` documents no response
 * body, so plain field access on a differently-spelled key yields undefined and
 * the screen renders "No reviews yet" — a confident, wrong answer to a coach
 * who has been reviewed. Reading every plausible spelling means an empty list
 * only ever means the API sent nothing.
 */

/** Where the list hides when the response is an envelope rather than an array. */
const LIST_KEYS = ["reviews", "items", "data", "rows", "results"];

const RATING_KEYS = ["rating", "stars", "score", "value"];
const COMMENT_KEYS = ["comment", "text", "body", "message", "review", "feedback"];
const CREATED_KEYS = ["createdAt", "created_at", "submittedAt", "date"];
const UPDATED_KEYS = ["updatedAt", "updated_at", "editedAt", "modifiedAt"];
const AVATAR_KEYS = [
  "clientAvatarUrl",
  "client.avatarUrl",
  "client.avatar",
  "user.avatarUrl",
  "avatarUrl",
  "avatar",
];
/** The reviewer's USER id — NOT membershipId, which the chat route can't open. */
const CLIENT_ID_KEYS = ["client.id", "clientId", "client.userId", "user.id", "userId"];

export function normalizeReviews(raw: unknown): CoachReview[] {
  if (raw === undefined || raw === null) return [];

  return pickList(raw, LIST_KEYS).map((item, index) => {
    const row = asRecord(item) ?? {};

    const rating = pickNumber(row, RATING_KEYS);
    const createdAt = pick(row, CREATED_KEYS) ?? null;
    const updatedAt = pick(row, UPDATED_KEYS) ?? null;

    return {
      id: pick(row, ["id", "reviewId", "_id"]) ?? `review-${index}`,
      // Out-of-range values are dropped rather than clamped: a 0 or a 7 means
      // the field isn't the 1–5 rating we think it is.
      rating: rating !== undefined && rating >= 1 && rating <= 5 ? rating : null,
      comment: pick(row, COMMENT_KEYS) ?? null,
      createdAt,
      updatedAt,
      writtenAt: updatedAt ?? createdAt,
      // "Client" is the fallback inside nameFrom — a review always names its
      // author on the card, even when the payload only carries the rating.
      clientName: nameFrom(row),
      clientAvatarUrl: pick(row, AVATAR_KEYS),
      clientUserId: pick(row, CLIENT_ID_KEYS),
    };
  });
}

/** Milliseconds for a review's write time; null when there is nothing to parse. */
export function reviewTimestamp(review: CoachReview): number | null {
  if (!review.writtenAt) return null;
  const parsed = Date.parse(review.writtenAt);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Newest first. Reviews with no usable date sort last, in the order received. */
export function sortReviewsNewestFirst(reviews: CoachReview[]): CoachReview[] {
  return [...reviews].sort((a, b) => {
    const left = reviewTimestamp(a);
    const right = reviewTimestamp(b);
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return right - left;
  });
}

/** How many reviews sit at each star, 5 → 1. Unrated reviews are excluded. */
export function ratingDistribution(reviews: CoachReview[]): { stars: number; count: number }[] {
  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((review) => review.rating === stars).length,
  }));
}

let described = false;

/**
 * Prints the payload once per session. If the list looks empty in the UI, this
 * is what separates "the coach has no reviews" from "the response nests them
 * under a key LIST_KEYS doesn't read" — and it is also how you find out whether
 * a row carries the client's user id the chat link needs.
 */
export function describeReviewsShape(raw: unknown): void {
  if (!__DEV__ || described || raw === undefined) return;
  described = true;
  const root = asRecord(raw);
  console.log(
    "[reviews] top-level:",
    Array.isArray(raw) ? `array(${raw.length})` : root ? Object.keys(root).join(", ") : typeof raw
  );
  console.log("[reviews] payload:", JSON.stringify(raw, null, 2));
}

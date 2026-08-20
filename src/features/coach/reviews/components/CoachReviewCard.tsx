import { formatReviewDate } from "@/features/shared/reviews/lib/reviews";
import type { CoachReview } from "@/features/shared/reviews/types";
import { initialsOf } from "@/features/coach/home/lib/format";
import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { StarRating } from "@/shared/ui/StarRating";
import { Surface } from "@/shared/ui/Surface";
import { Text, View } from "@/tw";
import { Image } from "@/tw/image";

/**
 * One review, as the coach reads it.
 *
 * Not the client's ReviewCard: this side carries the "new" mark and opens the
 * chat with whoever wrote it, and neither belongs on a public profile.
 */
export function CoachReviewCard({
  review,
  isNew = false,
  onPress,
}: {
  review: CoachReview;
  isNew?: boolean;
  /** Omitted when the payload carried no user id to open a chat with. */
  onPress?: () => void;
}) {
  const date = formatReviewDate(review.writtenAt);
  const edited = Boolean(
    review.updatedAt && review.createdAt && review.updatedAt !== review.createdAt
  );

  return (
    <Surface
      radius="lg"
      from={isNew ? "--sun-tint" : "--surface-hi"}
      to={isNew ? "--card" : "--surface-lo"}
      angle={140}
      onPress={onPress}
      className={cn("gap-2.5 p-3.5", isNew && "border border-sun/40")}
    >
      <View className="flex-row items-center gap-2.5">
        {review.clientAvatarUrl ? (
          <Image
            source={{ uri: review.clientAvatarUrl }}
            className="h-9 w-9 shrink-0 rounded-full bg-secondary object-cover"
          />
        ) : (
          <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
            <Text className="text-[12px] font-semibold text-secondary-foreground">
              {initialsOf(review.clientName)}
            </Text>
          </View>
        )}

        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text
              className="min-w-0 shrink text-[14.5px] font-semibold text-foreground"
              numberOfLines={1}
            >
              {review.clientName}
            </Text>
            {isNew ? (
              <View className="shrink-0 rounded-full bg-sun/30 px-2 py-0.5">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-sun-ink">
                  New
                </Text>
              </View>
            ) : null}
          </View>
          {date ? (
            <Text className="text-[11.5px] text-muted-foreground">
              {edited ? `Edited ${date}` : date}
            </Text>
          ) : null}
        </View>

        {/* A rating that didn't parse shows nothing rather than five empty
            stars, which would read as a one-star review. */}
        {review.rating !== null ? (
          <StarRating value={review.rating} size={12} className="shrink-0" />
        ) : null}
      </View>

      {review.comment ? (
        <Text className="text-[13.5px] leading-relaxed text-foreground/85">
          {review.comment}
        </Text>
      ) : (
        <Text className="text-[12.5px] italic text-muted-foreground">
          Rating only — no comment left.
        </Text>
      )}

      {onPress ? (
        <View className="flex-row items-center gap-1 pt-0.5">
          <Icon name="message-square" size={12} color="--primary" />
          <Text className="text-[12px] font-semibold text-primary">
            Message {review.clientName.split(" ")[0]}
          </Text>
        </View>
      ) : null}
    </Surface>
  );
}
CoachReviewCard.displayName = "CoachReviewCard";

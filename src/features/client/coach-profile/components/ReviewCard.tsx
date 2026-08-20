import type { Review } from "@/api/types";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { Image } from "@/tw/image";

import { formatReviewDate, reviewAuthorName, reviewAvatarUrl } from "@/features/shared/reviews/lib/reviews";
import { StarRating } from "@/shared/ui/StarRating";

export function ReviewCard({ review }: { review: Review }) {
  const date = formatReviewDate(review.updatedAt || review.createdAt);
  const avatarUrl = reviewAvatarUrl(review);

  return (
    <View className="gap-2 rounded-2xl bg-secondary/50 p-3.5">
      <View className="flex-row items-center gap-2.5">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="h-9 w-9 rounded-full bg-secondary" />
        ) : (
          <View className="h-9 w-9 items-center justify-center rounded-full bg-secondary">
            <Icon name="person" size={18} color="--muted-foreground" />
          </View>
        )}
        <View className="min-w-0 flex-1">
          <Text className="text-[14px] font-semibold text-foreground" numberOfLines={1}>
            {reviewAuthorName(review)}
          </Text>
          {date ? <Text className="text-[11.5px] text-muted-foreground">{date}</Text> : null}
        </View>
        <StarRating value={Number(review.rating) || 0} size={12} />
      </View>

      {review.comment ? (
        <Text className="text-[13.5px] leading-relaxed text-foreground/85">{review.comment}</Text>
      ) : null}
    </View>
  );
}

export function MyReviewCard({
  review,
  disabled,
  onEdit,
  onDelete,
}: {
  review: Review;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const date = formatReviewDate(review.updatedAt || review.createdAt);

  return (
    <View className="gap-2.5 rounded-2xl border-2 border-primary/30 bg-primary/5 p-3.5">
      <View className="flex-row items-center gap-2">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Your review
          </Text>
          <View className="flex-row items-center gap-2">
            <StarRating value={Number(review.rating) || 0} size={13} />
            {date ? <Text className="text-[11.5px] text-muted-foreground">{date}</Text> : null}
          </View>
        </View>

        <IconButton icon="pencil" label="Edit your review" disabled={disabled} onPress={onEdit} />
        <IconButton
          icon="trash"
          label="Delete your review"
          destructive
          disabled={disabled}
          onPress={onDelete}
        />
      </View>

      {review.comment ? (
        <Text className="text-[13.5px] leading-relaxed text-foreground/85">{review.comment}</Text>
      ) : null}
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  disabled,
  destructive = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityLabel={label}
      className={
        destructive
          ? "h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 active:opacity-70 disabled:opacity-50"
          : "h-9 w-9 items-center justify-center rounded-xl bg-card active:opacity-70 disabled:opacity-50"
      }
    >
      <Icon name={icon} size={15} color={destructive ? "--destructive" : "--foreground"} />
    </Pressable>
  );
}

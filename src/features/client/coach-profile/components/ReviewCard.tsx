import { useState } from "react";

import type { Review } from "@/api/types";
import { reviewAuthorName, reviewAvatarUrl } from "@/features/shared/reviews/lib/reviews";
import { cn } from "@/lib/utils";
import { StarRating } from "@/shared/ui/StarRating";
import { Surface } from "@/shared/ui/Surface";
import { Pressable, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { relativeDayLabel } from "@/shared/utils/date";

import { initialsOf } from "../lib/initials";

interface ReviewCardProps {
  review: Review;
  variant: "own" | "other";
  /** Own variant only. */
  disabled?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ReviewCard(props: ReviewCardProps) {
  return props.variant === "own" ? <OwnReview {...props} /> : <OtherReview {...props} />;
}

/**
 * The client's own review, marked as theirs by a warm wash and a primary spine
 * rather than by a filled button — the CTA downstairs owns the only solid
 * orange on this screen.
 */
function OwnReview({ review, disabled, onEdit, onDelete }: ReviewCardProps) {
  const writtenAt = review.updatedAt || review.createdAt;

  return (
    <Surface from="--primary-tint" to="--card" angle={140} className="gap-2.5 border border-primary/22 px-3.5 py-3.5">
      {/* The spine. Surface clips to its radius, so this reads as a tab on the
          card's edge rather than a stripe floating over it. */}
      <View className="absolute inset-y-0 left-0 w-0.5 bg-primary" pointerEvents="none" />

      <View className="flex-row items-center gap-2">
        <Text className="min-w-0 flex-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-primary-light">
          Your review
        </Text>

        {/* Text buttons, not icon bubbles — this row is an aside, not an
            action bar. hitSlop carries them to the 44px target. */}
        <TextButton label="Edit" onPress={onEdit} disabled={disabled} />
        <View className="h-3 w-px bg-border" />
        <TextButton label="Delete" onPress={onDelete} disabled={disabled} />
      </View>

      <View className="flex-row items-center gap-2">
        <StarRating value={Number(review.rating) || 0} size={15} color="--star" />
        {writtenAt ? (
          <Text className="text-[11.5px] text-muted-foreground">{relativeDayLabel(writtenAt)}</Text>
        ) : null}
      </View>

      {review.comment ? (
        <Text className="text-[13.5px] leading-normal text-foreground/80">{review.comment}</Text>
      ) : null}
    </Surface>
  );
}

function OtherReview({ review }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const name = reviewAuthorName(review);
  const avatarUrl = reviewAvatarUrl(review);
  const writtenAt = review.updatedAt || review.createdAt;

  return (
    <Surface className="gap-2.5 px-3.5 py-3.5">
      <View className="flex-row items-center gap-2.5">
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="h-9 w-9 shrink-0 rounded-full bg-secondary object-cover"
          />
        ) : (
          <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
            <Text className="text-[12px] font-semibold text-secondary-foreground">
              {initialsOf(name)}
            </Text>
          </View>
        )}

        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-[14px] font-semibold text-foreground" numberOfLines={1}>
            {name}
          </Text>
          {writtenAt ? (
            <Text className="text-[11.5px] text-muted-foreground">
              {relativeDayLabel(writtenAt)}
            </Text>
          ) : null}
        </View>

        <StarRating value={Number(review.rating) || 0} size={13} color="--star" className="shrink-0" />
      </View>

      {review.comment ? (
        <View className="gap-1">
          <Text
            className="text-[13.5px] leading-normal text-foreground/80"
            numberOfLines={expanded ? undefined : 4}
            // With numberOfLines set, this reports the lines actually drawn —
            // hitting the cap is the signal that there is more underneath.
            onTextLayout={(e) => {
              if (!expanded && e.nativeEvent.lines.length >= 4) setOverflows(true);
            }}
          >
            {review.comment}
          </Text>

          {overflows ? (
            <Pressable
              onPress={() => setExpanded((value) => !value)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              className="self-start active:opacity-70"
            >
              <Text className="text-[13px] font-semibold text-primary">
                {expanded ? "Less" : "More"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Surface>
  );
}

function TextButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label} your review`}
      hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
      className={cn("active:opacity-60", disabled && "opacity-50")}
    >
      <Text className="text-[12.5px] font-semibold text-foreground">{label}</Text>
    </Pressable>
  );
}

import { ratingDistribution } from "@/features/shared/reviews/lib/normalizeReviews";
import type { CoachReview } from "@/features/shared/reviews/types";
import { pluralise } from "@/features/coach/home/lib/format";
import { Icon } from "@/shared/ui/Icon";
import { StarRating } from "@/shared/ui/StarRating";
import { Surface } from "@/shared/ui/Surface";
import { Text, View } from "@/tw";

/**
 * The rating at the top of the Reviews screen.
 *
 * `average` and `total` come from /reviews/coaches/{tenantId}/summary when it
 * answered, so the number here matches the one on the coach's public profile;
 * the bars are counted from the list, which is the only per-star breakdown the
 * API exposes.
 */
export function RatingSummary({
  average,
  total,
  reviews,
}: {
  average: number | null;
  total: number;
  reviews: CoachReview[];
}) {
  const bars = ratingDistribution(reviews);
  // The bars are relative to the busiest star, not to the total — with 9 of 10
  // reviews at five stars the smaller rows would otherwise be invisible.
  const peak = Math.max(1, ...bars.map((bar) => bar.count));
  // Only what was counted here: a review whose rating didn't parse is in
  // `total` but in none of the bars, so the two can legitimately disagree.
  const rated = bars.reduce((sum, bar) => sum + bar.count, 0);

  return (
    <Surface radius="lg" from="--sun-tint" to="--card" angle={140} className="gap-3.5 p-4">
      <View className="flex-row items-center gap-4">
        <View className="items-center">
          <Text className="font-display text-[34px] font-bold leading-none tracking-[-0.02em] text-foreground">
            {average !== null ? average.toFixed(1) : "—"}
          </Text>
          <StarRating value={average ?? 0} size={13} className="mt-1.5" />
        </View>

        <View className="min-w-0 flex-1 gap-1">
          {bars.map((bar) => (
            <View key={bar.stars} className="flex-row items-center gap-2">
              <Text className="w-2 text-right text-[11px] text-muted-foreground">
                {bar.stars}
              </Text>
              <Icon name="star" size={9} color="--sun-ink" />
              <View className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                <View
                  className="h-full rounded-full bg-sun"
                  style={{ width: `${(bar.count / peak) * 100}%` }}
                />
              </View>
              <Text className="w-4 text-right text-[11px] text-muted-foreground">
                {bar.count}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Text className="text-[12.5px] text-muted-foreground">
        {total === 0
          ? "No reviews yet"
          : `${total} ${pluralise(total, "review")} from your clients` +
            (rated < total ? ` · ${total - rated} unrated` : "")}
      </Text>
    </Surface>
  );
}
RatingSummary.displayName = "RatingSummary";

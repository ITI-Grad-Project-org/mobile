import { useGetPublicReviewsSummaryQuery } from "@/api/endpoints/reviews.endpoints";
import { useCoachHomeData } from "@/features/coach/home/hooks/useCoachHomeData";
import { pluralise } from "@/features/coach/home/lib/format";
import { resolveSummary } from "@/features/shared/reviews/lib/reviews";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Surface } from "@/shared/ui/Surface";
import { Pressable, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl } from "react-native";

import { CoachReviewCard } from "../components/CoachReviewCard";
import { RatingSummary } from "../components/RatingSummary";
import { useCoachReviews } from "../hooks/useCoachReviews";

/**
 * Every review this coach has been left, newest first.
 *
 * The drill-down behind Home's review row and the Profile rating card. Opening
 * it is what marks the new ones read — there is no server-side read flag, so
 * the watermark is the app's own and lasts the session (see seenReviews).
 */
export function ReviewsScreen() {
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";
  const { tenantId } = useActiveTenant();
  const reviews = useCoachReviews();

  // The public summary, so this screen's average is the same number a client
  // sees on the profile. Usually already cached by the Profile screen.
  const summaryQuery = useGetPublicReviewsSummaryQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );
  const { average, total } = resolveSummary(summaryQuery.data, reviews.all);

  // A review's client id is read tolerantly out of an undocumented payload, so
  // it is only trusted as a chat target when the roster confirms it is a user
  // id this coach can actually open a thread with. Anything else renders as a
  // plain card rather than a link that dead-ends.
  const { clientUserIds } = useCoachHomeData();
  const rosterUserIds = useMemo(
    () => new Set(clientUserIds.values()),
    [clientUserIds]
  );

  // The "new" marks are frozen at the first load and NOT recomputed: opening
  // the screen marks everything seen, and a badge that vanishes under the
  // reader's eyes is worse than one that stays for this visit.
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(() => new Set());
  const frozen = useRef(false);
  const { hydrated, unseen, markAllSeen } = reviews;

  useEffect(() => {
    if (!hydrated || frozen.current) return;
    frozen.current = true;
    setNewIds(new Set(unseen.map((review) => review.id)));
    markAllSeen();
  }, [hydrated, unseen, markAllSeen]);

  const busy = !tenantId || (!hydrated && !reviews.isError);

  const subtitle = useMemo(() => {
    if (busy) return null;
    if (reviews.all.length === 0) return "Nothing yet";
    const count = `${total} ${pluralise(total, "review")}`;
    return average !== null ? `${count} · ${average.toFixed(1)} average` : count;
  }, [busy, reviews.all.length, total, average]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-4 px-5 pt-4 pb-screen"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={reviews.isFetching && !busy}
          onRefresh={() => {
            reviews.refetch();
            summaryQuery.refetch();
          }}
          tintColor={primaryColor}
        />
      }
    >
      <View className="flex-row items-center gap-2">
        <GlassButton
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-left" size={20} color="--foreground" />
        </GlassButton>
        <View className="min-w-0 flex-1">
          <Text className="font-display text-[24px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
            Reviews
          </Text>
          {subtitle ? (
            <Text className="mt-0.5 text-[12.5px] text-muted-foreground">{subtitle}</Text>
          ) : null}
        </View>
      </View>

      {busy ? (
        <View className="items-center py-16">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : reviews.isError ? (
        <Surface radius="lg" className="items-center gap-3 py-10">
          <Text className="text-sm text-muted-foreground">
            Couldn&apos;t load your reviews.
          </Text>
          <Pressable
            onPress={() => reviews.refetch()}
            className="h-11 items-center justify-center rounded-2xl bg-secondary px-6 active:opacity-80"
          >
            <Text className="text-[14px] font-semibold text-foreground">Retry</Text>
          </Pressable>
        </Surface>
      ) : reviews.all.length === 0 ? (
        <Surface radius="lg" className="items-center gap-1 py-10">
          <Text className="text-sm font-semibold text-foreground">No reviews yet</Text>
          <Text className="px-8 text-center text-xs text-muted-foreground">
            Clients can rate you from your public profile. They show up here as
            soon as they do.
          </Text>
        </Surface>
      ) : (
        <>
          <RatingSummary average={average} total={total} reviews={reviews.all} />

          <View className="gap-3">
            {reviews.all.map((review) => (
              <CoachReviewCard
                key={review.id}
                review={review}
                isNew={newIds.has(review.id)}
                onPress={
                  review.clientUserId && rosterUserIds.has(review.clientUserId)
                    ? () =>
                        router.push({
                          pathname: "/(coach)/chat/[id]",
                          params: { id: review.clientUserId as string },
                        })
                    : undefined
                }
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

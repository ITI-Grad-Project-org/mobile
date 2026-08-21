import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Extrapolation, interpolate, useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import { useGetDirectoryCoachQuery } from "@/api/endpoints/directory.endpoints";
import { useDeleteIntakeMutation, useGetIntakeQuery } from "@/api/endpoints/intake.endpoints";
import {
  useCreateJoinRequestMutation,
  useListMyJoinRequestsQuery,
  useWithdrawJoinRequestMutation,
} from "@/api/endpoints/joinRequests.endpoints";
import { useGetPublicCoachProfileQuery } from "@/api/endpoints/profile.endpoints";
import {
  useCreateClientReviewMutation,
  useDeleteClientReviewMutation,
  useGetClientCurrentReviewQuery,
  useGetPublicReviewsQuery,
  useGetPublicReviewsSummaryQuery,
  useLazyGetClientCurrentReviewQuery,
  useUpdateClientReviewMutation,
} from "@/api/endpoints/reviews.endpoints";
import type { Review } from "@/api/types";
import { resolveCoachFields, resolveTransformations } from "@/lib/coach";
import { cn } from "@/lib/utils";
import { useSwitchCoach } from "@/shared/hooks/useSwitchCoach";
import { Icon } from "@/shared/ui/Icon";
import { Surface } from "@/shared/ui/Surface";
import { useAppSelector } from "@/store";
import { membershipsSelectors } from "@/store/membershipsSlice";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "@/tw";
import { Animated } from "@/tw/animated";
import { Image } from "@/tw/image";

import { JoinRequestModal } from "@/features/client/match-coach/components/JoinRequestModal";
import { WithdrawRequestModal } from "@/features/client/match-coach/components/WithdrawRequestModal";

import { ConfirmSheet } from "../components/ConfirmSheet";
import { PackagesSheet } from "../components/PackagesSheet";
import { ProfileHero } from "../components/ProfileHero";
import { ProofStrip } from "../components/ProofStrip";
import { ReviewCard } from "../components/ReviewCard";
import { ReviewFormSheet } from "../components/ReviewFormSheet";
import { SectionLabel } from "../components/SectionLabel";
import { SettingsRow } from "../components/SettingsRow";
import { SpecialtyChip } from "../components/SpecialtyChip";
import { StickyActionBar } from "../components/StickyActionBar";
import { TransformationRail } from "../components/TransformationRail";
import { resolveCoachRating } from "../lib/aggregate";
import { initialsOf } from "../lib/initials";

type ActionScope = "intake" | "review";
type Confirming = ActionScope | null;

/** Where the nav title crossfades from "Coach profile" to the coach's name. */
const TITLE_SWAP_START = 96;
const TITLE_SWAP_END = 140;

export function CoachProfileScreen({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const { switchCoach, switchingId, activeTenantId } = useSwitchCoach();

  const membership = useAppSelector((s) =>
    membershipsSelectors.selectById(s.memberships, tenantId)
  );
  // Two modes: a coach you already train with (intake + review actions), or one
  // you found in the directory (read-only profile + a join request CTA).
  const isMember = membership?.role === "client" && membership?.status === "active";
  const isActive = isMember && tenantId === activeTenantId;

  // ---------------------------------------------------------------- queries
  const {
    data: coach,
    isLoading,
    isError,
    refetch,
  } = useGetDirectoryCoachQuery(tenantId, { skip: !tenantId });

  const f = resolveCoachFields(coach);

  // The directory payload is a card summary and doesn't always carry the
  // photos; `/coaches/{tenantId}/profile` is the full public profile. Only
  // fetched when the directory response came back without them.
  const { data: publicProfile } = useGetPublicCoachProfileQuery(tenantId, {
    skip: !tenantId || isLoading || f.transformationPhotos.length > 0,
  });

  const { data: summary } = useGetPublicReviewsSummaryQuery({ tenantId }, { skip: !tenantId });
  const {
    data: publicReviews,
    isLoading: reviewsLoading,
    isError: reviewsError,
  } = useGetPublicReviewsQuery({ tenantId }, { skip: !tenantId });

  // Both /client/me routes resolve the tenant from the JWT, so they only mean
  // anything while this coach is the active one.
  const { data: myReview } = useGetClientCurrentReviewQuery(
    { tenantId },
    { skip: !tenantId || !isActive }
  );
  const { data: intake, isError: intakeMissing } = useGetIntakeQuery(
    { tenantId },
    { skip: !tenantId || !isActive }
  );

  // Directory mode only: is there already a pending join request for this coach?
  const { data: myJoinRequests } = useListMyJoinRequestsQuery(undefined, { skip: isMember });
  const [createJoinRequest] = useCreateJoinRequestMutation();
  const [withdrawJoinRequest] = useWithdrawJoinRequestMutation();

  const pendingRequestId = useMemo(() => {
    if (!Array.isArray(myJoinRequests)) return null;
    const match = myJoinRequests.find(
      (r: any) => (r?.tenantId || r?.tenant?.id) === tenantId && r?.status !== "rejected"
    );
    return match?.id ?? null;
  }, [myJoinRequests, tenantId]);

  // ---------------------------------------------------------------- mutations
  const [fetchCurrentReview] = useLazyGetClientCurrentReviewQuery();
  const [createReview] = useCreateClientReviewMutation();
  const [updateReview] = useUpdateClientReviewMutation();
  const [deleteReview] = useDeleteClientReviewMutation();
  const [deleteIntake] = useDeleteIntakeMutation();

  // ---------------------------------------------------------------- ui state
  const [requestOpen, setRequestOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  // Optimistic flag: the list refetch lands a moment after the POST succeeds.
  const [requestSent, setRequestSent] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formExisting, setFormExisting] = useState<Review | null>(null);
  const [packagesOpen, setPackagesOpen] = useState(false);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bioOverflows, setBioOverflows] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [errorScope, setErrorScope] = useState<ActionScope>("intake");

  const hasPendingRequest = Boolean(pendingRequestId) || requestSent;
  const switching = switchingId === tenantId;
  const anyBusy = busy || switching;

  // ---------------------------------------------------------------- derived
  const transformations = useMemo(() => {
    const fromDirectory = resolveTransformations(coach);
    return fromDirectory.length > 0 ? fromDirectory : resolveTransformations(publicProfile);
  }, [coach, publicProfile]);

  const name = f.name || membership?.tenantName || "Coach";
  const firstName = f.firstName || name.split(" ")[0];
  const businessName = f.businessName && f.businessName !== name ? f.businessName : null;

  // Stabilised so the aggregate below isn't recomputed on every render by a
  // fresh `[]` literal.
  const reviews: Review[] = useMemo(() => publicReviews ?? [], [publicReviews]);
  const rating = useMemo(
    () => resolveCoachRating(summary, reviews, myReview),
    [summary, reviews, myReview]
  );
  const othersReviews = myReview?.id ? reviews.filter((r) => r.id !== myReview.id) : reviews;

  // A background that just restates the bio is worse than no background at all.
  const backgroundIsEcho =
    Boolean(f.bio && f.careerExperience) &&
    f.careerExperience!.trim().slice(0, 40).toLowerCase() ===
      f.bio!.trim().slice(0, 40).toLowerCase();
  const background = backgroundIsEcho ? null : f.careerExperience;

  const lowestPrice = f.priceFrom ?? f.priceTo;
  const showPrice = !isMember && lowestPrice != null;

  // ---------------------------------------------------------------- nav title
  const scrollY = useSharedValue(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.value = e.nativeEvent.contentOffset.y;
  };
  // Two layers stacked in a fixed-height slot, crossfading — the row never
  // reflows, so nothing beside the title shifts as you scroll.
  const staticTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [TITLE_SWAP_START, TITLE_SWAP_END],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));
  const scrolledTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [TITLE_SWAP_START, TITLE_SWAP_END],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  // ---------------------------------------------------------------- actions
  // Every /client/me action resolves the tenant from the JWT, so this coach has
  // to be the active one before we can write anything for them.
  const ensureActive = async () => {
    if (!isActive) await switchCoach(tenantId, { resetNavigation: false });
  };

  const runAction = async (
    scope: ActionScope,
    fn: () => Promise<void>,
    fallbackMessage: string
  ) => {
    if (anyBusy) return false;
    setBusy(true);
    setActionError(null);
    setErrorScope(scope);
    try {
      await ensureActive();
      await fn();
      setBusy(false);
      return true;
    } catch (e: any) {
      setActionError(e?.data?.message || e?.message || fallbackMessage);
      setBusy(false);
      return false;
    }
  };

  const sendJoinRequest = async (message: string) => {
    await createJoinRequest({ tenantId, message }).unwrap();
    setRequestSent(true);
  };

  const confirmWithdraw = async (requestId: string) => {
    await withdrawJoinRequest({ id: requestId }).unwrap();
    setRequestSent(false);
  };

  const openReviewForm = async () => {
    const ok = await runAction(
      "review",
      async () => {
        try {
          const current = await fetchCurrentReview({ tenantId }, true).unwrap();
          setFormExisting(current ?? null);
        } catch (e: any) {
          if (e?.status !== 404) throw e;
          setFormExisting(null);
        }
      },
      "Couldn't open the review form."
    );
    if (ok) setFormOpen(true);
  };

  const submitReview = async ({ rating: stars, comment }: { rating: number; comment: string }) => {
    if (formExisting) {
      // The previous rating is what lets the aggregate be re-weighted in place
      // instead of waiting for a refetch.
      await updateReview({
        body: { rating: stars, comment },
        tenantId,
        previousRating: formExisting.rating,
      }).unwrap();
    } else {
      await createReview({ body: { rating: stars, comment }, tenantId }).unwrap();
    }
    setFormOpen(false);
  };

  const confirmDeleteReview = async () => {
    const ok = await runAction(
      "review",
      async () => {
        await deleteReview({ tenantId, previousRating: myReview?.rating }).unwrap();
      },
      "Couldn't delete your review. Please try again."
    );
    if (ok) setConfirming(null);
  };

  const openIntake = async (mode: "edit" | "create") => {
    const ok = await runAction("intake", async () => {}, "Couldn't open your intake.");
    if (!ok) return;
    // Both this screen and the intake screen are root-stack routes, so a plain
    // push lands on top — no modal to dismiss first.
    router.push({
      pathname: "/(setup)/intake",
      params: { ...(mode === "edit" ? { edit: "1" } : {}), tenantId, coachName: name },
    });
  };

  const confirmDeleteIntake = async () => {
    const ok = await runAction(
      "intake",
      async () => {
        await deleteIntake({ tenantId }).unwrap();
      },
      "Couldn't delete your intake. Please try again."
    );
    if (ok) {
      setConfirming(null);
      router.back();
    }
  };

  const onCtaPress = () => {
    if (isMember) {
      runAction(
        "review",
        async () => {
          router.push("/(client)/(tabs)/chat");
        },
        "Couldn't open the chat."
      );
      return;
    }
    if (hasPendingRequest) {
      if (pendingRequestId) setWithdrawOpen(true);
      return;
    }
    setRequestOpen(true);
  };

  // `undefined` while the query is still deciding; a 404 means "none yet".
  const hasIntake = isActive ? Boolean(intake) && !intakeMissing : true;

  return (
    <View className="flex-1 bg-background">
      {/* ------------------------------------------------------------ nav */}
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="flex-row items-center gap-3 px-5 pb-3 pt-2">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border active:opacity-70"
          >
            <Icon name="chevron-left" size={18} color="--foreground" />
          </Pressable>

          <View className="h-9 min-w-0 flex-1 justify-center">
            <Animated.View
              className="absolute inset-x-0 justify-center"
              style={staticTitleStyle}
              pointerEvents="none"
            >
              <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                Coach profile
              </Text>
            </Animated.View>

            <Animated.View
              className="absolute inset-x-0 flex-row items-center gap-2"
              style={scrolledTitleStyle}
              pointerEvents="none"
            >
              {f.avatarUrl ? (
                <Image
                  source={{ uri: f.avatarUrl }}
                  className="h-6 w-6 shrink-0 rounded-full bg-secondary object-cover"
                />
              ) : (
                <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <Text className="text-[9px] font-semibold text-secondary-foreground">
                    {initialsOf(name)}
                  </Text>
                </View>
              )}
              <Text className="min-w-0 flex-1 text-base font-semibold text-foreground" numberOfLines={1}>
                {name}
              </Text>
            </Animated.View>
          </View>

          {/* Status is green, always — orange on this screen belongs to the CTA
              and to nothing else. */}
          {isMember ? (
            <View className="shrink-0 flex-row items-center gap-1.5 rounded-full bg-success/12 px-2.75 py-1.5">
              <View className="h-1.25 w-1.25 rounded-full bg-success" />
              <Text className="text-[11px] font-semibold uppercase tracking-[0.09em] text-success">
                Active
              </Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-5 pb-[120px] pt-1"
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {isError ? (
            <Surface className="items-center gap-3 px-4 py-8">
              <Text className="text-sm text-muted-foreground">
                Couldn&apos;t load this coach&apos;s profile.
              </Text>
              <Pressable
                onPress={() => refetch()}
                accessibilityRole="button"
                className="h-11 items-center justify-center rounded-full border border-border px-6 active:opacity-80"
              >
                <Text className="text-sm font-semibold text-foreground">Retry</Text>
              </Pressable>
            </Surface>
          ) : null}

          {/* --------------------------------------------------------- 2 */}
          <ProfileHero
            name={name}
            businessName={businessName}
            avatarUrl={f.avatarUrl}
            city={f.location}
            yearsExperience={f.yearsExperience}
          />

          {/* --------------------------------------------------------- 3 */}
          <ProofStrip
            clientsCoached={f.clientsCoached}
            yearsExperience={f.yearsExperience}
            averageRating={rating.average}
            reviewCount={rating.count}
          />

          {/* --------------------------------------------------------- 4 */}
          {f.bio ? (
            <View className="gap-1">
              <Text
                className="text-sm leading-[1.55] text-foreground/80"
                numberOfLines={bioExpanded ? undefined : 4}
                onTextLayout={(e) => {
                  if (!bioExpanded && e.nativeEvent.lines.length >= 4) setBioOverflows(true);
                }}
              >
                {f.bio}
              </Text>
              {bioOverflows ? (
                <Pressable
                  onPress={() => setBioExpanded((value) => !value)}
                  accessibilityRole="button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="self-start active:opacity-70"
                >
                  <Text className="text-[13px] font-semibold text-primary">
                    {bioExpanded ? "Less" : "More"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* --------------------------------------------------------- 5 */}
          {f.specialties.length > 0 ? (
            <View className="gap-2.5">
              <SectionLabel>Specialties</SectionLabel>
              <View className="flex-row flex-wrap gap-1.75">
                {f.specialties.map((specialty) => (
                  <SpecialtyChip key={specialty} specialty={specialty} />
                ))}
              </View>
            </View>
          ) : null}

          {/* --------------------------------------------------------- 6 */}
          {background ? (
            <View className="gap-2">
              <SectionLabel>Background</SectionLabel>
              <Text className="text-[13.5px] leading-[1.55] text-muted-foreground">
                {background}
              </Text>
            </View>
          ) : null}

          {/* --------------------------------------------------------- 7 */}
          <TransformationRail photos={transformations} />

          {/* --------------------------------------------------------- 9 */}
          <View className="gap-2.5">
            <View className="flex-row items-end justify-between">
              <Text className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
                Reviews
              </Text>
              {rating.count > 0 && rating.average != null ? (
                <View className="flex-row items-baseline gap-1.5">
                  <Text className="text-[15px] font-bold text-foreground">
                    {rating.average.toFixed(1)}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {rating.count} {rating.count === 1 ? "review" : "reviews"}
                  </Text>
                </View>
              ) : null}
            </View>

            {actionError && errorScope === "review" ? (
              <Text className="text-[12.5px] font-medium text-destructive">{actionError}</Text>
            ) : null}

            {myReview ? (
              <ReviewCard
                review={myReview}
                variant="own"
                disabled={anyBusy}
                onEdit={openReviewForm}
                onDelete={() => setConfirming("review")}
              />
            ) : null}

            {/* Only clients of this coach can review them, and only once. */}
            {isMember && !myReview ? (
              <Pressable
                onPress={openReviewForm}
                disabled={anyBusy}
                accessibilityRole="button"
                className={cn(
                  "h-12 flex-row items-center justify-center gap-2 rounded-full border border-border active:opacity-80",
                  anyBusy && "opacity-60"
                )}
              >
                {anyBusy ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Icon name="star-outline" size={15} color="--foreground" />
                )}
                <Text className="text-sm font-semibold text-foreground">Add review</Text>
              </Pressable>
            ) : null}

            {reviewsLoading ? (
              <View className="items-center py-6">
                <ActivityIndicator size="small" />
              </View>
            ) : reviewsError ? (
              <Text className="py-3 text-[13px] text-muted-foreground">
                Couldn&apos;t load reviews.
              </Text>
            ) : othersReviews.length > 0 ? (
              <View className="gap-2.5">
                {othersReviews.map((review, i) => (
                  <ReviewCard key={review.id ?? i} review={review} variant="other" />
                ))}
              </View>
            ) : myReview ? (
              <Text className="text-[13px] text-muted-foreground">No other reviews yet.</Text>
            ) : (
              <Text className="text-[13px] text-muted-foreground">
                {isMember
                  ? `No reviews yet — tell others what training with ${firstName} is like.`
                  : "No reviews yet."}
              </Text>
            )}
          </View>

          {/* --------------------------------------------------------- 10 */}
          {isMember ? (
            <View className="gap-2.5">
              <SectionLabel>Your intake</SectionLabel>

              <Surface>
                {hasIntake ? (
                  <>
                    <SettingsRow
                      icon="clipboard-list"
                      title="Edit intake"
                      subtitle="Goals, preferences & limitations"
                      onPress={() => openIntake("edit")}
                      disabled={anyBusy}
                    />
                    <SettingsRow
                      icon="trash"
                      title="Delete intake"
                      subtitle="Clears what this coach knows about you"
                      tone="quiet"
                      divided
                      onPress={() => setConfirming("intake")}
                      disabled={anyBusy}
                    />
                  </>
                ) : (
                  <SettingsRow
                    icon="clipboard-list"
                    title="Add intake"
                    subtitle="Goals, preferences & limitations"
                    onPress={() => openIntake("create")}
                    disabled={anyBusy}
                  />
                )}
              </Surface>

              <Text className="text-[11.5px] text-muted-foreground/70">
                Only {firstName} can see this.
              </Text>

              {actionError && errorScope === "intake" ? (
                <Text className="text-[12.5px] font-medium text-destructive">{actionError}</Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* ------------------------------------------------------------ 8 */}
      {!isLoading ? (
        <StickyActionBar
          price={showPrice ? { from: lowestPrice, currency: f.currency } : null}
          onPricePress={() => setPackagesOpen(true)}
          ctaLabel={ctaLabel({ isMember, hasPendingRequest, pendingRequestId, firstName })}
          ctaIcon={isMember ? "message-square" : hasPendingRequest ? "check" : "user-plus"}
          onCtaPress={onCtaPress}
          ctaDisabled={!isMember && hasPendingRequest && !pendingRequestId}
          ctaBusy={anyBusy}
        />
      ) : null}

      {/* ------------------------------------------------------------ sheets */}
      <PackagesSheet
        visible={packagesOpen}
        coachName={name}
        priceFrom={f.priceFrom}
        priceTo={f.priceTo}
        currency={f.currency}
        onClose={() => setPackagesOpen(false)}
      />

      {requestOpen ? (
        <JoinRequestModal
          coach={coach ?? { tenantId, firstName: name }}
          visible={requestOpen}
          onClose={() => setRequestOpen(false)}
          onSubmit={sendJoinRequest}
        />
      ) : null}

      {withdrawOpen && pendingRequestId ? (
        <WithdrawRequestModal
          coach={coach ?? { tenantId, firstName: name }}
          requestId={pendingRequestId}
          visible={withdrawOpen}
          onClose={() => setWithdrawOpen(false)}
          onWithdraw={confirmWithdraw}
        />
      ) : null}

      <ReviewFormSheet
        visible={formOpen}
        coachName={name}
        existing={formExisting}
        onClose={() => setFormOpen(false)}
        onSubmit={submitReview}
      />

      <ConfirmSheet
        visible={confirming === "review"}
        title="Delete your review?"
        message="Your rating and comment for this coach will be removed, and their rating will be recalculated without it."
        confirmLabel="Delete review"
        busy={anyBusy}
        error={errorScope === "review" ? actionError : null}
        onCancel={() => setConfirming(null)}
        onConfirm={confirmDeleteReview}
      />

      <ConfirmSheet
        visible={confirming === "intake"}
        title="Delete intake?"
        message={`This clears your goals, preferences and limitations. ${firstName} will no longer see any of it.`}
        confirmLabel="Delete intake"
        busy={anyBusy}
        error={errorScope === "intake" ? actionError : null}
        onCancel={() => setConfirming(null)}
        onConfirm={confirmDeleteIntake}
      />
    </View>
  );
}

/**
 * The CTA says what will actually happen. There is no pre-join messaging in
 * v1 — a directory coach is reached by applying to train with them — so the
 * label follows the join-request flow rather than promising a chat that the
 * client can't open yet.
 */
function ctaLabel({
  isMember,
  hasPendingRequest,
  pendingRequestId,
  firstName,
}: {
  isMember: boolean;
  hasPendingRequest: boolean;
  pendingRequestId: string | null;
  firstName: string;
}): string {
  if (isMember) return "Open chat";
  if (!hasPendingRequest) return `Request to train with ${firstName}`;
  return pendingRequestId ? "Requested — tap to withdraw" : "Requested";
}

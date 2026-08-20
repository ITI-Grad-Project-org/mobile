import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator } from "react-native";

import { useGetDirectoryCoachQuery } from "@/api/endpoints/directory.endpoints";
import { useDeleteIntakeMutation } from "@/api/endpoints/intake.endpoints";
import {
  useCreateJoinRequestMutation,
  useListMyJoinRequestsQuery,
  useWithdrawJoinRequestMutation,
} from "@/api/endpoints/joinRequests.endpoints";
import {
  useCreateClientReviewMutation,
  useDeleteClientReviewMutation,
  useGetClientCurrentReviewQuery,
  useGetPublicReviewsQuery,
  useGetPublicReviewsSummaryQuery,
  useLazyGetClientCurrentReviewQuery,
  useUpdateClientReviewMutation,
} from "@/api/endpoints/reviews.endpoints";
import { useGetPublicCoachProfileQuery } from "@/api/endpoints/profile.endpoints";
import type { Review } from "@/api/types";
import { resolveCoachFields, resolveTransformationPhotos } from "@/lib/coach";
import { cn } from "@/lib/utils";
import { useSwitchCoach } from "@/shared/hooks/useSwitchCoach";
import { Card } from "@/shared/ui/Card";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { useAppSelector } from "@/store";
import { membershipsSelectors } from "@/store/membershipsSlice";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { Tone } from "@/tw/Tone";

import { JoinRequestModal } from "@/features/client/match-coach/components/JoinRequestModal";
import { WithdrawRequestModal } from "@/features/client/match-coach/components/WithdrawRequestModal";

import { ConfirmSheet } from "../components/ConfirmSheet";
import { MyReviewCard, ReviewCard } from "../components/ReviewCard";
import { ReviewFormSheet } from "../components/ReviewFormSheet";
import { StarRating } from "@/shared/ui/StarRating";
import { TransformationGallery } from "../components/TransformationGallery";
import { resolveSummary } from "@/features/shared/reviews/lib/reviews";
import { GlassButton } from "@/shared/ui/GlassButton";

type ActionScope = "intake" | "review";
type Confirming = ActionScope | null;

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

  const {
    data: coach,
    isLoading,
    isError,
    refetch,
  } = useGetDirectoryCoachQuery(tenantId, { skip: !tenantId });
  const { data: summary } = useGetPublicReviewsSummaryQuery({ tenantId }, { skip: !tenantId });
  const {
    data: publicReviews,
    isLoading: reviewsLoading,
    isError: reviewsError,
  } = useGetPublicReviewsQuery({ tenantId }, { skip: !tenantId });
  const { data: myReview } = useGetClientCurrentReviewQuery(
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

  const [requestOpen, setRequestOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  // Optimistic flag: the list refetch lands a moment after the POST succeeds.
  const [requestSent, setRequestSent] = useState(false);
  const hasPendingRequest = Boolean(pendingRequestId) || requestSent;

  const [fetchCurrentReview] = useLazyGetClientCurrentReviewQuery();
  const [createReview] = useCreateClientReviewMutation();
  const [updateReview] = useUpdateClientReviewMutation();
  const [deleteReview] = useDeleteClientReviewMutation();
  const [deleteIntake] = useDeleteIntakeMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [formExisting, setFormExisting] = useState<Review | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [errorScope, setErrorScope] = useState<ActionScope>("intake");

  const f = resolveCoachFields(coach);

  // The directory payload is a card summary and doesn't always carry the
  // photos; `/coaches/{tenantId}/profile` is the full public profile. Only
  // fetched when the directory response came back without them.
  const { data: publicProfile } = useGetPublicCoachProfileQuery(tenantId, {
    skip: !tenantId || isLoading || f.transformationPhotos.length > 0,
  });
  const transformationPhotos = f.transformationPhotos.length
    ? f.transformationPhotos
    : resolveTransformationPhotos(publicProfile);

  const name = f.name || membership?.tenantName || "Coach";
  const businessName = f.businessName && f.businessName !== name ? f.businessName : null;

  const reviews = publicReviews ?? [];
  const { average, total } = resolveSummary(summary, reviews);
  const othersReviews = myReview?.id ? reviews.filter((r) => r.id !== myReview.id) : reviews;

  const switching = switchingId === tenantId;
  const anyBusy = busy || switching;

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
    const ok = await runAction("review", async () => {
      try {
        const current = await fetchCurrentReview({ tenantId }, true).unwrap();
        setFormExisting(current ?? null);
      } catch (e: any) {
        if (e?.status !== 404) throw e;
        setFormExisting(null);
      }
    }, "Couldn't open the review form.");
    if (ok) setFormOpen(true);
  };

  const submitReview = async ({ rating, comment }: { rating: number; comment: string }) => {
    if (formExisting) {
      await updateReview({ body: { rating, comment }, tenantId }).unwrap();
    } else {
      await createReview({ body: { rating, comment }, tenantId }).unwrap();
    }
    setFormOpen(false);
  };

  const confirmDeleteReview = async () => {
    const ok = await runAction(
      "review",
      async () => {
        await deleteReview({ tenantId }).unwrap();
      },
      "Couldn't delete your review. Please try again."
    );
    if (ok) setConfirming(null);
  };

  const openEditIntake = async () => {
    const ok = await runAction("intake", async () => {}, "Couldn't open your intake.");
    if (!ok) return;
    // Both this screen and the intake screen are root-stack routes, so a plain
    // push lands on top — no modal to dismiss first.
    router.push({
      pathname: "/(setup)/intake",
      params: { edit: "1", tenantId, coachName: name },
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

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="flex-row items-center gap-2 px-3 py-2">
          <GlassButton
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
          >
            <Icon name="chevron-left" size={20} color="--foreground" />
          </GlassButton>
          <Text className="min-w-0 flex-1 text-[17px] font-bold text-foreground" numberOfLines={1}>
            {name}
          </Text>
          {!isMember ? null : isActive ? (
            <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1">
              <Icon name="check" size={11} color="--primary" />
              <Text className="text-[11px] font-semibold text-primary">Active</Text>
            </View>
          ) : switching ? (
            <ActivityIndicator size="small" />
          ) : (
            <Pressable
              onPress={() => switchCoach(tenantId).catch(() => setActionError("Couldn't switch coach."))}
              disabled={anyBusy}
              className="rounded-full bg-secondary px-3 py-1.5 active:opacity-80 disabled:opacity-60"
            >
              <Text className="text-[12.5px] font-semibold text-primary">Switch</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-y-4 px-4 pb-16 pt-2"
          showsVerticalScrollIndicator={false}
        >
          {isError ? (
            <Card glass className="items-center gap-3 py-8">
              <Text className="text-[14px] text-muted-foreground">
                Couldn&apos;t load this coach&apos;s profile.
              </Text>
              <Pressable
                onPress={() => refetch()}
                className="h-11 items-center justify-center rounded-2xl bg-secondary px-6 active:opacity-80"
              >
                <Text className="text-[14px] font-semibold text-foreground">Retry</Text>
              </Pressable>
            </Card>
          ) : null}

          {/* Coach */}
          <Card glass className="gap-3">
            <View className="flex-row items-center gap-3">
              {f.avatarUrl ? (
                <Image
                  source={{ uri: f.avatarUrl }}
                  className="h-16 w-16 rounded-3xl bg-secondary object-cover"
                />
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-3xl bg-secondary">
                  <Icon name="person" size={28} color="--muted-foreground" />
                </View>
              )}
              <View className="min-w-0 flex-1">
                <Text className="text-[19px] font-bold text-foreground" numberOfLines={1}>
                  {name}
                </Text>
                {businessName ? (
                  <Text className="text-[13px] font-semibold text-primary" numberOfLines={1}>
                    {businessName}
                  </Text>
                ) : null}
                {f.location || f.yearsExperience != null ? (
                  <Text className="mt-0.5 text-[12.5px] text-muted-foreground" numberOfLines={1}>
                    {[f.location, f.yearsExperience != null ? `${f.yearsExperience} yrs experience` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                ) : null}
              </View>
            </View>

            {f.bio ? (
              <Text className="text-[13.5px] leading-relaxed text-foreground/85">{f.bio}</Text>
            ) : null}

            {f.specialties.length > 0 ? (
              <View className="flex-row flex-wrap gap-1.5">
                {f.specialties.map((s) => (
                  <View key={s} className="rounded-full bg-secondary px-3 py-1">
                    <Text className="text-[12px] font-semibold capitalize text-foreground">{s}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {f.careerExperience ? (
              <View>
                <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Background
                </Text>
                <Text className="mt-1 text-[13px] text-foreground/80">{f.careerExperience}</Text>
              </View>
            ) : null}

            {f.priceFrom != null || f.priceTo != null ? (
              <Tone name="lilac" className="rounded-2xl p-3.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lilac-ink opacity-80">
                  Pricing
                </Text>
                <Text className="mt-1 text-[13.5px] font-medium text-lilac-ink">
                  {f.priceFrom != null && f.priceTo != null && f.priceFrom !== f.priceTo
                    ? `$${f.priceFrom} – $${f.priceTo} / month`
                    : `From $${f.priceFrom ?? f.priceTo} / month`}
                </Text>
              </Tone>
            ) : null}
          </Card>

          {/* Transformations */}
          <TransformationGallery photos={transformationPhotos} />

          {/* Reviews */}
          <Card glass className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-[15px] font-bold text-foreground">Reviews</Text>
              {average != null ? (
                <View className="flex-row items-center gap-1.5">
                  <StarRating value={average} size={13} />
                  <Text className="text-[13px] font-semibold text-foreground">
                    {average.toFixed(1)}
                  </Text>
                  <Text className="text-[12px] text-muted-foreground">
                    ({total})
                  </Text>
                </View>
              ) : null}
            </View>

            {actionError && errorScope === "review" ? (
              <Text className="text-[12.5px] font-medium text-destructive">{actionError}</Text>
            ) : null}

            {/* Only clients of this coach can review them. */}
            {myReview ? (
              <MyReviewCard
                review={myReview}
                disabled={anyBusy}
                onEdit={openReviewForm}
                onDelete={() => setConfirming("review")}
              />
            ) : isMember ? (
              <Pressable
                onPress={openReviewForm}
                disabled={anyBusy}
                className="h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90 disabled:opacity-60"
              >
                {anyBusy ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Icon name="star" size={15} color="--primary-foreground" />
                )}
                <Text className="text-[14px] font-semibold text-primary-foreground">
                  Add review
                </Text>
              </Pressable>
            ) : null}

            {reviewsLoading ? (
              <View className="items-center py-6">
                <ActivityIndicator size="small" />
              </View>
            ) : reviewsError ? (
              <Text className="py-4 text-center text-[13px] text-muted-foreground">
                Couldn&apos;t load reviews.
              </Text>
            ) : othersReviews.length === 0 ? (
              <Text className="py-4 text-center text-[13px] text-muted-foreground">
                {myReview ? "No other reviews yet." : "No reviews yet — be the first."}
              </Text>
            ) : (
              <View className="gap-2.5">
                {othersReviews.map((r, i) => (
                  <ReviewCard key={r.id ?? i} review={r} />
                ))}
              </View>
            )}
          </Card>

          {/* Directory mode: the only thing you can do is apply to train here. */}
          {!isMember ? (
            <Card glass className="gap-3">
              <View>
                <Text className="text-[15px] font-bold text-foreground">
                  {hasPendingRequest ? "Request pending" : "Train with this coach"}
                </Text>
                <Text className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {hasPendingRequest
                    ? `${name.split(" ")[0]} will review your request and get back to you.`
                    : "Send a join request with a short note about your goals."}
                </Text>
              </View>

              <Pressable
                onPress={() => (hasPendingRequest ? setWithdrawOpen(true) : setRequestOpen(true))}
                // Withdrawing needs the request id, which arrives with the list refetch.
                disabled={hasPendingRequest && !pendingRequestId}
                className={cn(
                  "h-14 flex-row items-center justify-center gap-2 rounded-2xl active:opacity-90 disabled:opacity-60",
                  hasPendingRequest
                    ? "border border-success/30 bg-success/15"
                    : "bg-primary shadow-soft"
                )}
              >
                <Icon
                  name={hasPendingRequest ? "check" : "user-plus"}
                  size={15}
                  color={hasPendingRequest ? "--success" : "--primary-foreground"}
                />
                <Text
                  className={cn(
                    "text-[14.5px] font-semibold",
                    hasPendingRequest ? "text-success" : "text-primary-foreground"
                  )}
                >
                  {!hasPendingRequest
                    ? "Send join request"
                    : pendingRequestId
                      ? "Requested — tap to withdraw"
                      : "Requested"}
                </Text>
              </Pressable>
            </Card>
          ) : null}

          {/* Manage */}
          {isMember ? (
            <View className="gap-2">
              <View className="flex-row items-baseline justify-between px-1">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Your intake
                </Text>
                {!isActive ? (
                  <Text className="text-[11px] text-muted-foreground">Switches coach first</Text>
                ) : null}
              </View>

              <Card glass className="p-2">
                <ManageRow
                  icon="clipboard-list"
                  label="Edit intake"
                  hint="Your goals, preferences & limitations"
                  onPress={openEditIntake}
                  disabled={anyBusy}
                />
                <View className="mx-3 h-px bg-border/60" />
                <ManageRow
                  icon="trash"
                  label="Delete intake"
                  hint="Clears what this coach knows about you"
                  destructive
                  onPress={() => setConfirming("intake")}
                  disabled={anyBusy}
                />
              </Card>

              {actionError && errorScope === "intake" ? (
                <Text className="px-1 text-[12.5px] font-medium text-destructive">
                  {actionError}
                </Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      )}

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
        message="Your rating and comment for this coach will be removed."
        confirmLabel="Delete review"
        busy={anyBusy}
        error={errorScope === "review" ? actionError : null}
        onCancel={() => setConfirming(null)}
        onConfirm={confirmDeleteReview}
      />

      <ConfirmSheet
        visible={confirming === "intake"}
        title="Delete intake?"
        message="This removes your goals & preferences for this coach."
        confirmLabel="Delete intake"
        busy={anyBusy}
        error={errorScope === "intake" ? actionError : null}
        onCancel={() => setConfirming(null)}
        onConfirm={confirmDeleteIntake}
      />
    </View>
  );
}

function ManageRow({
  icon,
  label,
  hint,
  onPress,
  disabled,
  destructive = false,
}: {
  icon: IconName;
  label: string;
  hint: string;
  onPress: () => void;
  disabled: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center gap-3 rounded-2xl p-3 active:opacity-70 disabled:opacity-50"
    >
      <View
        className={cn(
          "h-9 w-9 items-center justify-center rounded-xl",
          destructive ? "bg-destructive/10" : "bg-secondary"
        )}
      >
        <Icon name={icon} size={16} color={destructive ? "--destructive" : "--muted-foreground"} />
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className={cn(
            "text-[15px] font-semibold",
            destructive ? "text-destructive" : "text-foreground"
          )}
        >
          {label}
        </Text>
        <Text className="text-[12.5px] text-muted-foreground" numberOfLines={1}>
          {hint}
        </Text>
      </View>
      <Icon name="chevron-right" size={15} color="--muted-foreground" />
    </Pressable>
  );
}

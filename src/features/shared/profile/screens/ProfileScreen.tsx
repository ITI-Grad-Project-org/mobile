import { baseApi } from "@/api/baseApi";
import {
  useDeleteClientProfileMutation,
  useDeleteCoachProfileMutation,
  useGetClientProfileQuery,
  useGetCoachProfileQuery,
} from "@/api/endpoints/profile.endpoints";
import {
  useLogoutCoachMutation,
  useLogoutCustomerMutation,
} from "@/api/endpoints/auth.endpoints";
import { useGetActivityGraphQuery } from "@/api/endpoints/activity.endpoints";
import { useGetClientsQuery } from "@/api/endpoints/clients.endpoints";
import { useGetDirectoryCoachQuery } from "@/api/endpoints/directory.endpoints";
import { useGetIntakeQuery } from "@/api/endpoints/intake.endpoints";
import { useGetPublicReviewsSummaryQuery } from "@/api/endpoints/reviews.endpoints";
import { useGetTenantMeQuery } from "@/api/endpoints/tenant.endpoints";
import { MeasurementsSummaryCard } from "@/features/client/progress";
import type { ReduxMembership } from "@/store/membershipsSlice";
import { disconnectChatSocket } from "@/lib/chatSocket";
import { resolveCoachFields } from "@/lib/coach";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { resetProfile } from "@/shared/hooks/useProfileSetup";
import { useSwitchCoach } from "@/shared/hooks/useSwitchCoach";
import { fullName } from "@/shared/utils/name";
import { Card } from "@/shared/ui/Card";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { useAppDispatch, useAppSelector } from "@/store";
import { clearActiveTenant } from "@/store/activeTenantSlice";
import { clearAuth, clearTokens } from "@/store/authSlice";
import { clearChatUi } from "@/store/chatUiSlice";
import { clearMemberships, membershipsSelectors } from "@/store/membershipsSlice";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator } from "react-native";

import { DeleteAccountSheet } from "../components/DeleteAccountSheet";
import {
  deriveRosterStats,
  formatRating,
  humanizeEnum,
  publicProfileHandle,
} from "../lib/profileStats";

type StreakAccent = "green" | "orange";

const swatches: { key: StreakAccent; label: string; color: string }[] = [
  { key: "green", label: "Forest", color: "#30a14e" },
  { key: "orange", label: "Sunset", color: "#f0883e" },
];

type SettingsRow = {
  icon: IconName;
  label: string;
  hint?: string | null;
  onPress?: () => void;
};

export function ProfileScreen() {
  // This screen lives at the root, outside both route groups, so the mounted
  // group can't be read off the segments — the signed-in persona decides.
  const persona = useAppSelector((s) => s.auth.persona);
  const { role } = useActiveTenant();
  const isCoach = persona === "coach" || role === "owner";
  return isCoach ? <CoachProfile /> : <ClientProfile />;
}

function CoachProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { tenantId } = useActiveTenant();
  const { data: profile, isLoading } = useGetCoachProfileQuery();
  const [logoutCoach] = useLogoutCoachMutation();
  const [deleteCoach] = useDeleteCoachProfileMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Header stats. All three are cached elsewhere in the app, so this screen
  // usually paints them without a round trip.
  const { data: clients } = useGetClientsQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );
  const { data: reviewSummary } = useGetPublicReviewsSummaryQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );
  const { data: tenant } = useGetTenantMeQuery();

  const openEdit = () => {
    router.push({
      pathname: "/(setup)/coach-profile",
      params: { edit: "1" },
    });
  };

  // Clear all local session state and return to login. Shared by sign-out and
  // account deletion.
  const resetAndLeave = async () => {
    await clearTokens();
    // The chat socket authenticates with its own copy of the token.
    disconnectChatSocket();
    dispatch(clearAuth());
    dispatch(clearChatUi());
    dispatch(clearActiveTenant());
    dispatch(clearMemberships());
    dispatch(baseApi.util.resetApiState());
    router.replace("/(auth)/login");
  };

  const signOut = async () => {
    try {
      await logoutCoach().unwrap();
    } catch (e) {
      console.warn("Coach logout failed:", e);
    }
    await resetAndLeave();
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteCoach().unwrap();
      await resetProfile();
      setConfirmDelete(false);
      await resetAndLeave();
    } catch (e) {
      console.warn("Coach account deletion failed:", e);
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const coachName = fullName(profile?.firstName, profile?.lastName) || "Coach";
  const coachEmail = profile?.email || "";
  const coachAvatar = profile?.avatarUrl || profile?.avatar || null;
  const certs = profile?.certifications || [];

  const roster = deriveRosterStats(clients);
  const rating = formatRating(
    reviewSummary?.averageRating ?? reviewSummary?.average ?? null
  );
  const reviewCount: number =
    reviewSummary?.totalReviews ?? reviewSummary?.count ?? 0;
  const specialty = humanizeEnum(profile?.specialties?.[0]);
  const yearsExperience: number | undefined = profile?.yearsExperience;
  const handle = publicProfileHandle(tenant?.slug);

  const coachRows: SettingsRow[] = [
    { icon: "sparkles", label: "AI knowledge base" },
    { icon: "palette", label: "Branding", hint: tenant?.name || "Logo, colors" },
    { icon: "credit-card", label: "Billing & payouts", hint: "Not available yet" },
    {
      icon: "bell",
      label: "Notifications",
      onPress: () => router.push("/(coach)/notifications"),
    },
    { icon: "person", label: "Public profile", hint: handle },
  ];

  return (
    <View className="flex-1 bg-background">
      {/* Full-screen push: this route sits above the app header, so this header
          owns the top safe area. */}
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="px-3 pt-1 pb-3 flex-row items-center gap-2 border-b border-border">
          <GlassButton
            onPress={() => router.back()}
            className="h-9 w-9 rounded-full items-center justify-center active:opacity-70"
            accessibilityLabel="Go back"
          >
            <Icon name="chevron-left" size={18} color="--foreground" />
          </GlassButton>
          <Text className="text-foreground text-xl font-bold">Profile</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-y-5 px-4 pt-5 pb-30"
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <Card tone="ink" className="flex-row items-center gap-4" glass>
          <View className="h-16 w-16 rounded-full overflow-hidden border border-white/20">
            {coachAvatar ? (
              <Image source={coachAvatar} className="h-full w-full" />
            ) : (
              <View className="h-full w-full bg-white/10 items-center justify-center">
                <Icon name="person" size={28} color="--ink-foreground" />
              </View>
            )}
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-ink-foreground text-lg font-bold">
              Coach {coachName}
            </Text>
            <Text className="text-ink-foreground/70 text-sm">
              {coachEmail}
            </Text>
            {/* Chips are dropped entirely when the data behind them is absent —
                a new coach shows none rather than a zeroed-out badge. */}
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {specialty ? (
                <View className="rounded-full bg-primary/20 px-2.5 py-1">
                  <Text className="text-primary text-xs font-semibold">
                    {specialty}
                  </Text>
                </View>
              ) : null}
              {rating ? (
                <View className="rounded-full bg-white/10 px-2.5 py-1">
                  <Text className="text-ink-foreground text-xs font-semibold">
                    {rating} ★
                  </Text>
                </View>
              ) : null}
              {typeof yearsExperience === "number" ? (
                <View className="rounded-full bg-white/10 px-2.5 py-1">
                  <Text className="text-ink-foreground text-xs font-semibold">
                    {yearsExperience} yr{yearsExperience === 1 ? "" : "s"} exp
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <Pressable
            onPress={openEdit}
            className="h-9 w-9 rounded-full bg-white/15 items-center justify-center active:opacity-70"
            accessibilityLabel="Edit profile"
          >
            <Icon name="pencil" size={16} color="--ink-foreground" />
          </Pressable>
        </Card>

        {/* Stats */}
        <View className="flex-row gap-3">
          <Card tone="mint" className="flex-1" glass>
            <Text className="text-mint-ink/70 text-[11px] font-semibold uppercase tracking-wider">
              Active clients
            </Text>
            <Text className="text-mint-ink text-2xl font-black mt-1">
              {roster.active}
            </Text>
            <Text className="text-mint-ink/80 text-[11px]">
              of {roster.total} on roster
            </Text>
          </Card>
          <Card tone="lilac" className="flex-1" glass>
            <Text className="text-lilac-ink/70 text-[11px] font-semibold uppercase tracking-wider">
              Rating
            </Text>
            <Text className="text-lilac-ink text-2xl font-black mt-1">
              {rating ?? "—"}
            </Text>
            <Text className="text-lilac-ink/80 text-[11px]">
              {reviewCount === 0
                ? "No reviews yet"
                : `${reviewCount} review${reviewCount === 1 ? "" : "s"}`}
            </Text>
          </Card>
        </View>

        {/* Certifications */}
        <Card glass>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-foreground text-[15px] font-bold">
                Certifications
              </Text>
              <Text className="text-muted-foreground text-xs">
                {certs.length} on file
              </Text>
            </View>
            <Pressable onPress={openEdit} className="active:opacity-70">
              <Text className="text-primary text-xs font-semibold">Manage</Text>
            </Pressable>
          </View>
          {certs.length === 0 ? (
            <View className="mt-3 rounded-2xl border-2 border-dashed border-border bg-secondary/40 p-4">
              <Text className="text-muted-foreground text-[12.5px] text-center">
                No certificates yet. Add a few in your profile to build trust.
              </Text>
            </View>
          ) : (
            <View className="mt-3 gap-y-2">
              {certs.slice(0, 3).map((c: any, i: number) => (
                <View
                  key={i}
                  className="flex-row items-center gap-3 rounded-2xl bg-secondary/50 p-2.5"
                >
                  <View className="h-12 w-12 rounded-xl bg-primary/10 items-center justify-center">
                    <Icon name="trophy" size={24} color="--primary" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-1.5">
                      <Text
                        className="text-foreground text-[13.5px] font-semibold"
                        numberOfLines={1}
                      >
                        {c.name || "Certification"}
                      </Text>
                    </View>
                    <Text className="text-muted-foreground text-[11.5px]">
                      {c.issuer ? `${c.issuer}` : "Verified Issuer"}
                      {c.issueDate ? ` · ${new Date(c.issueDate).getFullYear()}` : ""}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Edit profile shortcut */}
        <Pressable
          onPress={openEdit}
          className="flex-row items-center justify-between rounded-2xl bg-primary px-4 py-4 shadow-soft active:opacity-90"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 rounded-xl bg-white/15 items-center justify-center">
              <Icon name="activity" size={16} color="--primary-foreground" />
            </View>
            <Text className="text-primary-foreground text-base font-semibold">
              Edit my profile
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color="--primary-foreground" />
        </Pressable>

        {/* Settings rows */}
        <Card className="p-2" glass>
          {coachRows.map((r) => (
            <Pressable
              key={r.label}
              onPress={r.onPress}
              className="flex-row items-center gap-3 rounded-2xl p-3 active:opacity-70"
            >
              <View className="h-9 w-9 rounded-xl bg-secondary items-center justify-center">
                <Icon name={r.icon} size={16} color="--muted-foreground" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-foreground text-base font-semibold">
                  {r.label}
                </Text>
                {r.hint ? (
                  <Text className="text-muted-foreground text-[13px]">
                    {r.hint}
                  </Text>
                ) : null}
              </View>
              <Icon name="chevron-right" size={16} color="--muted-foreground" />
            </Pressable>
          ))}
        </Card>

        {/* Sign out */}
        <Pressable
          onPress={signOut}
          className="flex-row items-center justify-center gap-2 rounded-2xl bg-secondary py-3.5 active:opacity-70"
        >
          <Icon name="log-out" size={16} color="--destructive" />
          <Text className="text-destructive text-base font-semibold">
            Log out
          </Text>
        </Pressable>

        {/* Delete account */}
        <Pressable
          onPress={() => setConfirmDelete(true)}
          className="items-center justify-center rounded-2xl py-3 active:opacity-70"
        >
          <Text className="text-destructive text-[13px] font-semibold">
            Delete account
          </Text>
        </Pressable>
      </ScrollView>

      <DeleteAccountSheet
        visible={confirmDelete}
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteAccount}
      />
    </View>
  );
}

function CoachSwitchRow({
  membership,
  active,
  switching,
  disabled,
  onPress,
  onSwitch,
}: {
  membership: ReduxMembership;
  active: boolean;
  switching: boolean;
  disabled: boolean;
  /** Open the coach's profile screen. */
  onPress: () => void;
  /** Make this coach the active one, without leaving the profile. */
  onSwitch: () => void;
}) {
  const { data: coach } = useGetDirectoryCoachQuery(membership.tenantId);
  const f = resolveCoachFields(coach);

  const name = f.name || membership.tenantName;
  const avatarUrl = f.avatarUrl || membership.brand?.logoUrl;
  const subtitle =
    f.specialties.length > 0 ? f.specialties.slice(0, 2).join(" · ") : membership.status;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "flex-row items-center gap-3 rounded-2xl border-2 p-3 active:opacity-80",
        active
          ? "border-primary bg-primary/5"
          : "border-transparent bg-secondary/50",
        disabled && !switching && "opacity-50"
      )}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          className="h-12 w-12 rounded-2xl bg-secondary"
        />
      ) : (
        <View className="h-12 w-12 rounded-2xl bg-secondary items-center justify-center">
          <Icon name="person" size={22} color="--muted-foreground" />
        </View>
      )}
      <View className="flex-1 min-w-0">
        <Text
          className="text-foreground text-base font-bold"
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          className="text-muted-foreground text-[13px] capitalize"
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
      {switching ? (
        <ActivityIndicator size="small" />
      ) : active ? (
        <View className="h-7 w-7 rounded-full bg-primary items-center justify-center">
          <Icon name="check" size={16} color="--primary-foreground" />
        </View>
      ) : (
        <Pressable
          onPress={onSwitch}
          disabled={disabled}
          hitSlop={8}
          accessibilityLabel={`Switch to ${name}`}
          className="rounded-full bg-secondary px-3 py-1.5 active:opacity-70"
        >
          <Text className="text-primary text-sm font-semibold">Switch</Text>
        </Pressable>
      )}
      <Icon name="chevron-right" size={14} color="--muted-foreground" />
    </Pressable>
  );
}

function ClientProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { data: profile, isLoading } = useGetClientProfileQuery();
  const [logoutCustomer] = useLogoutCustomerMutation();
  const [deleteClient] = useDeleteClientProfileMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [selectedAccent, setSelectedAccent] = useState<StreakAccent>("green");

  const activeTenantId = useAppSelector((s) => s.activeTenant.tenantId);
  const memberships = useAppSelector((s) =>
    membershipsSelectors.selectAll(s.memberships)
  );
  // Only active tenants where the user trains as a client — exclude any owner
  // membership and any non-active status (invited/paused/removed).
  const coachMemberships = memberships.filter(
    (m) => m.role === "client" && m.status === "active"
  );
  const { switchCoach, switchingId } = useSwitchCoach();

  // Header stats: the streak comes from the same graph the Today screen draws,
  // the goal from the intake filled in for the active coach.
  const { data: activity } = useGetActivityGraphQuery(undefined, {
    refetchOnFocus: true,
  });
  const { data: intake } = useGetIntakeQuery(
    { tenantId: activeTenantId ?? "" },
    { skip: !activeTenantId }
  );

  const handleSwitch = (tenantId: string) => {
    switchCoach(tenantId).catch((e) => console.warn("Switch tenant failed:", e));
  };

  // This screen is a plain push, so everything below is a plain push too — the
  // back button walks the stack back here.
  const openCoach = (tenantId: string) => {
    router.push({ pathname: "/coach/[tenantId]", params: { tenantId } });
  };

  const openEdit = () => {
    router.push({
      pathname: "/(setup)/client-profile",
      params: { edit: "1" },
    });
  };
  const openAddCoach = () => {
    router.push("/(setup)/match-coach");
  };

  const resetAndLeave = async () => {
    await clearTokens();
    // The chat socket authenticates with its own copy of the token.
    disconnectChatSocket();
    dispatch(clearAuth());
    dispatch(clearChatUi());
    dispatch(clearActiveTenant());
    dispatch(clearMemberships());
    dispatch(baseApi.util.resetApiState());
    router.replace("/(auth)/login");
  };

  const signOut = async () => {
    try {
      await logoutCustomer().unwrap();
    } catch (e) {
      console.warn("Client logout failed:", e);
    }
    await resetAndLeave();
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteClient().unwrap();
      await resetProfile();
      setConfirmDelete(false);
      await resetAndLeave();
    } catch (e) {
      console.warn("Client account deletion failed:", e);
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const clientName = fullName(profile?.firstName, profile?.lastName) || "Client";
  const clientEmail = profile?.email || "";
  const clientAvatar = profile?.avatarUrl || profile?.avatar || null;

  const streakDays = activity?.summary?.currentStreakDays ?? 0;
  const goal = humanizeEnum(intake?.goal);

  const rows: SettingsRow[] = [
    {
      icon: "bell",
      label: "Notifications",
      onPress: () => router.push("/(client)/notifications"),
    },
    { icon: "credit-card", label: "Subscription", hint: "Not available yet" },
    { icon: "shield", label: "Privacy" },
    { icon: "help-circle", label: "Help & support" },
  ];

  return (
    <View className="flex-1 bg-background">
      {/* Full-screen push: the app header is hidden for this route, so this
          header owns the top safe area. */}
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="px-3 pt-1 pb-3 flex-row items-center gap-2 border-b border-border">
          <GlassButton
            onPress={() => router.back()}
            className="h-9 w-9 rounded-full items-center justify-center active:opacity-70"
            accessibilityLabel="Go back"
          >
            <Icon name="chevron-left" size={18} color="--foreground" />
          </GlassButton>
          <Text className="text-foreground text-xl font-bold">Profile</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-y-5 px-4 pt-5 pb-30"
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <Card tone="ink" className="flex-row items-center gap-4" glass>
          <View className="h-16 w-16 rounded-full overflow-hidden border border-white/20">
            {clientAvatar ? (
              <Image source={clientAvatar} className="h-full w-full" />
            ) : (
              <View className="h-full w-full bg-white/10 items-center justify-center">
                <Icon name="person" size={28} color="--ink-foreground" />
              </View>
            )}
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-ink-foreground text-xl font-bold">
              {clientName}
            </Text>
            <Text className="text-ink-foreground/70 text-sm">
              {clientEmail}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              <View className="rounded-full bg-primary/20 px-2.5 py-1">
                <Text className="text-primary text-xs font-semibold">
                  {streakDays > 0
                    ? `${streakDays}-day streak`
                    : "No streak yet"}
                </Text>
              </View>
              {goal ? (
                <View className="rounded-full bg-white/10 px-2.5 py-1">
                  <Text className="text-ink-foreground text-xs font-semibold">
                    {goal}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <Pressable
            onPress={openEdit}
            className="h-9 w-9 rounded-full bg-white/15 items-center justify-center active:opacity-70"
            accessibilityLabel="Edit profile"
          >
            <Icon name="pencil" size={16} color="--ink-foreground" />
          </Pressable>
        </Card>

        {/* Body measurements */}
        <MeasurementsSummaryCard />

        {/* Switch coach */}
        <Card glass>
          <View className="mb-3">
            <Text className="text-foreground text-lg font-bold">
              My coaches
            </Text>
            <Text className="text-muted-foreground text-[13px]">
              Tap a coach to view their profile, or switch instantly.
            </Text>
          </View>
          <View className="gap-y-2">
            {coachMemberships.length === 0 ? (
              <Text className="text-muted-foreground text-[13px] pb-1">
                You&apos;re not training with any coach yet.
              </Text>
            ) : (
              coachMemberships.map((m) => (
                <CoachSwitchRow
                  key={m.tenantId}
                  membership={m}
                  active={m.tenantId === activeTenantId}
                  switching={switchingId === m.tenantId}
                  disabled={Boolean(switchingId)}
                  onPress={() => openCoach(m.tenantId)}
                  onSwitch={() => handleSwitch(m.tenantId)}
                />
              ))
            )}
            <Pressable
              onPress={openAddCoach}
              className="flex-row items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/30 py-3 active:opacity-70"
            >
              <Icon name="user-plus" size={16} color="--muted-foreground" />
              <Text className="text-muted-foreground text-[13px] font-semibold">
                Add coach
              </Text>
            </Pressable>
          </View>
        </Card>

        {/* Streak color */}
        <Card glass>
          <View className="flex-row items-start gap-3">
            <View className="h-9 w-9 rounded-xl bg-secondary items-center justify-center">
              <Icon name="palette" size={16} color="--muted-foreground" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-foreground text-base font-semibold">
                Streak color
              </Text>
              <Text className="text-muted-foreground text-[13px]">
                Choose your activity-grid palette
              </Text>
              <View className="mt-3 flex-row gap-2">
                {swatches.map((s) => (
                  <Pressable
                    key={s.key}
                    onPress={() => setSelectedAccent(s.key)}
                    className={cn(
                      "flex-row items-center gap-2 rounded-full border-2 bg-secondary/60 px-3 py-1.5 active:opacity-70",
                      selectedAccent === s.key
                        ? "border-foreground"
                        : "border-transparent"
                    )}
                  >
                    <View
                      className="h-4 w-4 rounded-sm"
                      style={{ backgroundColor: s.color }}
                    />
                    <Text className="text-foreground text-sm font-semibold">
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Card>

        {/* Edit profile shortcut */}
        <Pressable
          onPress={openEdit}
          className="flex-row items-center justify-between rounded-2xl bg-primary px-4 py-4 shadow-soft active:opacity-90"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 rounded-xl bg-white/15 items-center justify-center">
              <Icon name="activity" size={16} color="--primary-foreground" />
            </View>
            <Text className="text-primary-foreground text-base font-semibold">
              Edit my profile
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color="--primary-foreground" />
        </Pressable>

        {/* Settings rows */}
        <Card className="p-2" glass>
          {rows.map((r) => (
            <Pressable
              key={r.label}
              onPress={r.onPress}
              className={cn(
                "flex-row items-center gap-3 rounded-2xl p-3 active:opacity-70"
              )}
            >
              <View className="h-9 w-9 rounded-xl bg-secondary items-center justify-center">
                <Icon name={r.icon} size={16} color="--muted-foreground" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-foreground text-base font-semibold">
                  {r.label}
                </Text>
                {r.hint ? (
                  <Text className="text-muted-foreground text-[13px]">
                    {r.hint}
                  </Text>
                ) : null}
              </View>
              <Icon name="chevron-right" size={16} color="--muted-foreground" />
            </Pressable>
          ))}
        </Card>

        {/* Sign out */}
        <Pressable
          onPress={signOut}
          className="flex-row items-center justify-center gap-2 rounded-2xl bg-secondary py-3.5 active:opacity-70"
        >
          <Icon name="log-out" size={16} color="--destructive" />
          <Text className="text-destructive text-base font-semibold">
            Log out
          </Text>
        </Pressable>

        {/* Delete account */}
        <Pressable
          onPress={() => setConfirmDelete(true)}
          className="items-center justify-center rounded-2xl py-3 active:opacity-70"
        >
          <Text className="text-destructive text-[13px] font-semibold">
            Delete account
          </Text>
        </Pressable>
      </ScrollView>

      <DeleteAccountSheet
        visible={confirmDelete}
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteAccount}
      />
    </View>
  );
}


import { baseApi } from "@/api/baseApi";
import {
  useGetClientProfileQuery,
  useGetCoachProfileQuery,
} from "@/api/endpoints/profile.endpoints";
import {
  useLogoutCoachMutation,
  useLogoutCustomerMutation,
} from "@/api/endpoints/auth.endpoints";
import { useActiveCoach } from "@/lib/role";
import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { useAppDispatch } from "@/store";
import { clearActiveTenant } from "@/store/activeTenantSlice";
import { clearAuth, clearTokens } from "@/store/authSlice";
import { clearMemberships } from "@/store/membershipsSlice";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { useRouter, useSegments } from "expo-router";
import { useState } from "react";
import { ActivityIndicator } from "react-native";

type StreakAccent = "green" | "orange";

const coaches: {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
}[] = [
    {
      id: "mike",
      name: "Coach Mike",
      specialty: "Strength & conditioning",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    },
    {
      id: "sara",
      name: "Coach Sara",
      specialty: "Mobility & yoga",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    },
  ];

const swatches: { key: StreakAccent; label: string; color: string }[] = [
  { key: "green", label: "Forest", color: "#30a14e" },
  { key: "orange", label: "Sunset", color: "#f0883e" },
];

const rows: { icon: IconName; label: string; hint?: string }[] = [
  { icon: "bell", label: "Notifications", hint: "On" },
  { icon: "credit-card", label: "Subscription", hint: "Pro · monthly" },
  { icon: "shield", label: "Privacy" },
  { icon: "help-circle", label: "Help & support" },
];

const coachRows: { icon: IconName; label: string; hint?: string }[] = [
  { icon: "sparkles", label: "AI knowledge base", hint: "12 docs uploaded" },
  { icon: "palette", label: "Branding", hint: "Logo, colors" },
  { icon: "credit-card", label: "Billing & payouts", hint: "Stripe connected" },
  { icon: "bell", label: "Notifications" },
  { icon: "person", label: "Public profile", hint: "marco.uply.app" },
];

export function ProfileScreen() {
  const segments = useSegments() as string[];
  const isCoach = segments.includes("(coach)");
  return isCoach ? <CoachProfile /> : <ClientProfile />;
}

function CoachProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: profile, isLoading } = useGetCoachProfileQuery();
  const [logoutCoach] = useLogoutCoachMutation();

  const openEdit = () => { };

  const signOut = async () => {
    try {
      await logoutCoach().unwrap();
    } catch (e) {
      console.warn("Coach logout failed:", e);
    }
    await clearTokens();
    dispatch(clearAuth());
    dispatch(clearActiveTenant());
    dispatch(clearMemberships());
    dispatch(baseApi.util.resetApiState());
    router.replace("/(auth)/login");
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const coachName = profile ? `${profile.firstName} ${profile.lastName}` : "Coach";
  const coachEmail = profile?.email || "";
  const coachAvatar = profile?.avatar || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=200&q=80";
  const certs = profile?.certifications || [];

  return (
    <View className="flex-1 bg-background">
      {/* Modal header with close control */}
      <View className="px-4 pt-3 pb-3 flex-row items-center justify-between border-b border-border">
        <Text className="text-foreground text-xl font-bold">Profile</Text>
        <GlassButton
          onPress={() => router.back()}
          className="h-9 w-9 rounded-full bg-secondary items-center justify-center active:opacity-70"
          accessibilityLabel="Close profile"
        >
          <Icon name="x" size={18} color="--muted-foreground" />
        </GlassButton>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-y-5 px-4 pt-5 pb-30"
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <Card tone="ink" className="flex-row items-center gap-4" glass>
          <View className="h-16 w-16 rounded-full overflow-hidden border border-white/20">
            <Image source={coachAvatar} className="h-full w-full" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-ink-foreground text-lg font-bold">
              Coach {coachName}
            </Text>
            <Text className="text-ink-foreground/70 text-sm">
              {coachEmail}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              <View className="rounded-full bg-primary/20 px-2.5 py-1">
                <Text className="text-primary text-xs font-semibold">
                  $8.4k MRR
                </Text>
              </View>
              <View className="rounded-full bg-white/10 px-2.5 py-1">
                <Text className="text-ink-foreground text-xs font-semibold">
                  4.9 ★
                </Text>
              </View>
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
              Retention
            </Text>
            <Text className="text-mint-ink text-2xl font-black mt-1">87%</Text>
            <Text className="text-mint-ink/80 text-[11px]">90-day</Text>
          </Card>
          <Card tone="lilac" className="flex-1" glass>
            <Text className="text-lilac-ink/70 text-[11px] font-semibold uppercase tracking-wider">
              Avg adherence
            </Text>
            <Text className="text-lilac-ink text-2xl font-black mt-1">82%</Text>
            <Text className="text-lilac-ink/80 text-[11px]">across active</Text>
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
      </ScrollView>
    </View>
  );
}

function ClientProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const active = useActiveCoach();

  const { data: profile, isLoading } = useGetClientProfileQuery();
  const [logoutCustomer] = useLogoutCustomerMutation();

  const [selectedAccent, setSelectedAccent] = useState<StreakAccent>("green");
  const [activeCoachId, setActiveCoachId] = useState(coaches[0].id);

  const openEdit = () => { };
  const openAddCoach = () => {
    if (router.canDismiss()) router.dismiss();
    router.push("/(setup)/match-coach");
  };

  const signOut = async () => {
    try {
      await logoutCustomer().unwrap();
    } catch (e) {
      console.warn("Client logout failed:", e);
    }
    await clearTokens();
    dispatch(clearAuth());
    dispatch(clearActiveTenant());
    dispatch(clearMemberships());
    dispatch(baseApi.util.resetApiState());
    router.replace("/(auth)/login");
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const clientName = profile ? `${profile.firstName} ${profile.lastName}` : "Client";
  const clientEmail = profile?.email || "";
  const clientAvatar = profile?.avatar || null;

  return (
    <View className="flex-1 bg-background">
      {/* Modal header with close control */}
      <View className="px-4 pt-3 pb-3 flex-row items-center justify-between border-b border-border">
        <Text className="text-foreground text-xl font-bold">Profile</Text>
        <GlassButton
          onPress={() => router.back()}
          className="h-9 w-9 rounded-full bg-secondary items-center justify-center active:opacity-70"
          accessibilityLabel="Close profile"
        >
          <Icon name="x" size={18} color="--muted-foreground" />
        </GlassButton>
      </View>

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
                  12-day streak
                </Text>
              </View>
              <View className="rounded-full bg-white/10 px-2.5 py-1">
                <Text className="text-ink-foreground text-xs font-semibold">
                  {active.specialty}
                </Text>
              </View>
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

        {/* Switch coach */}
        <Card glass>
          <View className="mb-3">
            <Text className="text-foreground text-lg font-bold">
              Switch coach
            </Text>
            <Text className="text-muted-foreground text-[13px]">
              Tap to switch — your plan updates instantly.
            </Text>
          </View>
          <View className="gap-y-2">
            {coaches.map((c) => {
              const on = c.id === activeCoachId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setActiveCoachId(c.id)}
                  className={cn(
                    "flex-row items-center gap-3 rounded-2xl border-2 p-3 active:opacity-80",
                    on
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-secondary/50"
                  )}
                >
                  <Image source={c.avatar} className="h-12 w-12 rounded-2xl" />
                  <View className="flex-1 min-w-0">
                    <Text
                      className="text-foreground text-base font-bold"
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                    <Text className="text-muted-foreground text-[13px]">
                      {c.specialty}
                    </Text>
                  </View>
                  {on ? (
                    <View className="h-7 w-7 rounded-full bg-primary items-center justify-center">
                      <Icon
                        name="check"
                        size={16}
                        color="--primary-foreground"
                      />
                    </View>
                  ) : (
                    <Text className="text-primary text-sm font-semibold">
                      Switch
                    </Text>
                  )}
                </Pressable>
              );
            })}
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
      </ScrollView>
    </View>
  );
}


import { useActiveCoach, useRole } from "@/lib/role";
import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { useRouter } from "expo-router";
import { useState } from "react";

type StreakAccent = "green" | "orange";

const coaches: { id: string; name: string; specialty: string; avatar: string }[] = [
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

export function ClientProfileScreen() {
  const router = useRouter();
  const { accent, clientProfile } = useRole();
  const active = useActiveCoach();

  const [selectedAccent, setSelectedAccent] = useState<StreakAccent>(accent);
  const [activeCoachId, setActiveCoachId] = useState(coaches[0].id);

  // Sub-modals (EditProfile / MatchCoach) are deferred — inert placeholders for now.
  const openEdit = () => {};
  const openAddCoach = () => {};
  const signOut = () => router.replace("/(auth)/login");

  return (
    <View className="flex-1 bg-background">
      {/* Modal header with close control */}
      <View
        className="px-4 pt-3 pb-3 flex-row items-center justify-between border-b border-border"
      >
        <Text className="text-foreground text-xl font-bold">Profile</Text>
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 rounded-full bg-secondary items-center justify-center active:opacity-70"
          accessibilityLabel="Close profile"
        >
          <Icon name="x" size={18} color="--muted-foreground" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-y-5 px-4 pt-5 pb-30"
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <Card tone="ink" className="flex-row items-center gap-4" glass>
          <View className="h-16 w-16 rounded-full overflow-hidden border border-white/20">
            {clientProfile.avatar ? (
              <Image source={clientProfile.avatar} className="h-full w-full" />
            ) : (
              <View className="h-full w-full bg-white/10 items-center justify-center">
                <Icon name="person" size={28} color="--ink-foreground" />
              </View>
            )}
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-ink-foreground text-xl font-bold">
              {clientProfile.fname} {clientProfile.lname}
            </Text>
            <Text className="text-ink-foreground/70 text-sm">{clientProfile.email}</Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              <View className="rounded-full bg-primary/20 px-2.5 py-1">
                <Text className="text-primary text-xs font-semibold">12-day streak</Text>
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
            <Text className="text-foreground text-lg font-bold">Switch coach</Text>
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
                    on ? "border-primary bg-primary/5" : "border-transparent bg-secondary/50",
                  )}
                >
                  <Image source={c.avatar} className="h-12 w-12 rounded-2xl" />
                  <View className="flex-1 min-w-0">
                    <Text className="text-foreground text-base font-bold" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text className="text-muted-foreground text-[13px]">{c.specialty}</Text>
                  </View>
                  {on ? (
                    <View className="h-7 w-7 rounded-full bg-primary items-center justify-center">
                      <Icon name="check" size={16} color="--primary-foreground" />
                    </View>
                  ) : (
                    <Text className="text-primary text-sm font-semibold">Switch</Text>
                  )}
                </Pressable>
              );
            })}
            <Pressable
              onPress={openAddCoach}
              className="flex-row items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/30 py-3 active:opacity-70"
            >
              <Icon name="user-plus" size={16} color="--muted-foreground" />
              <Text className="text-muted-foreground text-[13px] font-semibold">Add coach</Text>
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
              <Text className="text-foreground text-base font-semibold">Streak color</Text>
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
                      selectedAccent === s.key ? "border-foreground" : "border-transparent",
                    )}
                  >
                    <View className="h-4 w-4 rounded-sm" style={{ backgroundColor: s.color }} />
                    <Text className="text-foreground text-sm font-semibold">{s.label}</Text>
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
          {rows.map((r, i) => (
            <Pressable
              key={r.label}
              className={cn(
                "flex-row items-center gap-3 rounded-2xl p-3 active:opacity-70",
              )}
            >
              <View className="h-9 w-9 rounded-xl bg-secondary items-center justify-center">
                <Icon name={r.icon} size={16} color="--muted-foreground" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-foreground text-base font-semibold">{r.label}</Text>
                {r.hint ? (
                  <Text className="text-muted-foreground text-[13px]">{r.hint}</Text>
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
          <Text className="text-destructive text-base font-semibold">Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

import { Icon } from "@/shared/ui/Icon";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";

import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { markProfileComplete } from "@/shared/hooks/useProfileSetup";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Segmented } from "@/shared/ui/Segmented";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
  useCSSVariable,
} from "@/tw";
import { Image } from "@/tw/image";
import { Tone } from "@/tw/Tone";
import { CoachCard } from "../components/CoachCard";
import { CoachSheet } from "../components/CoachSheet";
import {
  COACHES,
  SPECIALTY_TAGS,
  coachForCode,
  type SearchCoach,
} from "../data";

type Tab = "invite" | "search";

const TABS = [
  { value: "invite" as const, label: "Invite code" },
  { value: "search" as const, label: "Find a coach" },
];

export function MatchCoachScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("invite");

  // Invite flow
  const [code, setCode] = useState("");
  const [codeOK, setCodeOK] = useState<SearchCoach | null>(null);
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [days, setDays] = useState("");
  const [level, setLevel] = useState("");
  const [focus, setFocus] = useState<string[]>([]);

  // Search flow
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [requested, setRequested] = useState<Record<string, boolean>>({});
  const [profile, setProfile] = useState<SearchCoach | null>(null);
  const [sentTo, setSentTo] = useState<SearchCoach | null>(null);

  const muted = useCSSVariable("--muted-foreground") as string;
  const lilacInk = useCSSVariable("--lilac-ink") as string;

  const enterAppWith = async (c: SearchCoach) => {
    await markProfileComplete({ coachId: c.id, days, level, focus });
    router.replace("/(client)/(tabs)/today");
  };

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(client)/(tabs)/today");
  };

  const tryCode = () => {
    const coach = coachForCode(code);
    if (!coach) {
      sfx.error();
      setCodeErr(
        "That code isn't valid. Try MARCO2026, ELENA-YOGA or UPLY-VIP."
      );
      return;
    }
    setCodeErr(null);
    sfx.success();
    setCodeOK(coach);
  };

  const filtered = useMemo(
    () =>
      COACHES.filter((c) => {
        const matchQ = q
          ? (c.name + c.specialties.join(" ") + c.location)
              .toLowerCase()
              .includes(q.toLowerCase())
          : true;
        const matchT = filter ? c.specialties.includes(filter) : true;
        return matchQ && matchT;
      }),
    [q, filter]
  );

  const sendRequest = (c: SearchCoach) => {
    sfx.success();
    setRequested((r) => ({ ...r, [c.id]: true }));
    setSentTo(c);
    setProfile(null);
  };

  const totalRequested = Object.values(requested).filter(Boolean).length;
  const firstRequested = COACHES.find((c) => requested[c.id]) ?? null;

  // Auto-dismiss the "request sent" toast.
  useEffect(() => {
    if (!sentTo) return;
    const id = setTimeout(() => setSentTo(null), 1800);
    return () => clearTimeout(id);
  }, [sentTo]);

  // ===== Invite: last step (days + level + focus) =====
  if (codeOK) {
    const ready = Boolean(days && level);
    const firstName = codeOK.name.split(" ")[0];
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
        <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
          <GlassButton
            onPress={() => setCodeOK(null)}
            accessibilityLabel="Back"
            className="h-9 w-9 rounded-full"
          >
            <Icon name="chevron-left" size={18} color="--foreground" />
          </GlassButton>
          <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Last step
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8 pt-2 grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Tone
            name="mint"
            className="flex-row items-center gap-3 rounded-3xl p-4 shadow-soft"
            glass
          >
            <Image
              source={codeOK.avatar}
              className="h-14 w-14 rounded-2xl bg-secondary"
              style={{ objectFit: "cover" }}
            />
            <View>
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-mint-ink opacity-70">
                You&apos;re matched with
              </Text>
              <Text className="text-[18px] font-bold text-mint-ink">
                {codeOK.name}
              </Text>
              <Text className="text-[12px] text-mint-ink opacity-80">
                {codeOK.specialty}
              </Text>
            </View>
          </Tone>

          <Text className="mt-7 text-[26px] font-bold text-foreground">
            A few quick questions
          </Text>
          <Text className="mt-1 text-[14px] text-muted-foreground">
            So {firstName} can build the right plan for you.
          </Text>

          <View className="mt-6 gap-6">
            <View>
              <ChipsLabel>
                How many days a week do you want to train?
              </ChipsLabel>
              <ChipsRow
                value={days}
                onChange={setDays}
                options={["2", "3", "4", "5", "6"]}
              />
            </View>
            <View>
              <ChipsLabel>What&apos;s your fitness level?</ChipsLabel>
              <ChipsRow
                value={level}
                onChange={setLevel}
                options={["Beginner", "Intermediate", "Advanced"]}
              />
            </View>
            <View>
              <ChipsLabel>What are you focused on?</ChipsLabel>
              <ChipsRow
                multiValue={focus}
                onToggle={(o) =>
                  setFocus((f) =>
                    f.includes(o) ? f.filter((x) => x !== o) : [...f, o]
                  )
                }
                options={[
                  "Strength",
                  "Yoga",
                  "Cardio",
                  "Weight loss",
                  "Mobility",
                ]}
              />
            </View>
          </View>
        </ScrollView>

        <View className="border-t border-border/60 px-5 pt-3">
          <Pressable
            disabled={!ready}
            onPress={() => enterAppWith(codeOK)}
            className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90 disabled:opacity-50"
          >
            <Text className="text-[15px] font-semibold text-primary-foreground">
              Take me to my plan
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ===== Main matcher =====
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header + toggle */}
        <View className="gap-3 px-5 pb-3 pt-2">
          <View className="flex-row items-center gap-3">
            <GlassButton
              onPress={leave}
              accessibilityLabel="Back"
              className="h-9 w-9 rounded-full"
            >
              <Icon name="chevron-left" size={18} color="--foreground" />
            </GlassButton>
            <View className="flex-1">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                One more step
              </Text>
              <Text className="text-[22px] font-bold text-foreground">
                Connect with a coach
              </Text>
            </View>
          </View>
          <Segmented
            options={TABS}
            value={tab}
            onChange={setTab}
            labelClassName="font-semibold"
          />
          {tab === "search" ? (
            <View>
              <View className="relative">
                <View className="absolute left-3.5 top-0 bottom-0 z-10 justify-center">
                  <Feather name="search" size={16} color={muted} />
                </View>
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Name, specialty, location…"
                  placeholderTextColor={muted}
                  className="h-12 rounded-2xl bg-secondary pl-10 pr-4 text-[14px] text-foreground"
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-3"
                contentContainerClassName="gap-2 pr-5"
              >
                <FilterChip
                  on={!filter}
                  onPress={() => setFilter(null)}
                  label="All"
                />
                {SPECIALTY_TAGS.map((t) => (
                  <FilterChip
                    key={t}
                    on={filter === t}
                    onPress={() => setFilter(t)}
                    label={t}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {/* Body */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8 pt-2 grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {tab === "invite" ? (
            <View className="gap-4">
              <Tone name="lilac" className="rounded-3xl p-5 shadow-soft" glass>
                <View className="flex-row items-center gap-2">
                  <Feather name="tag" size={13} color={lilacInk} />
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lilac-ink opacity-80">
                    Invite code
                  </Text>
                </View>
                <Text className="mt-1 text-[13.5px] text-lilac-ink">
                  Got a code from a coach? Drop it here and we&apos;ll skip the
                  search.
                </Text>
              </Tone>

              <View className="rounded-3xl bg-card p-5 shadow-soft">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Code
                </Text>
                <TextInput
                  value={code}
                  onChangeText={(t) => {
                    setCode(t);
                    setCodeErr(null);
                  }}
                  placeholder="e.g. MARCO2026"
                  placeholderTextColor={muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  className="mt-1.5 rounded-2xl bg-secondary px-4 py-3.5 text-center text-[16px] font-bold uppercase tracking-[4px] text-foreground"
                />
                {codeErr ? (
                  <Text className="mt-2 text-[12px] font-medium text-destructive">
                    {codeErr}
                  </Text>
                ) : null}
                <Pressable
                  onPress={tryCode}
                  disabled={!code.trim()}
                  className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90 disabled:opacity-50"
                >
                  <Text className="text-[14px] font-semibold text-primary-foreground">
                    Continue
                  </Text>
                </Pressable>
                <View className="mt-3 flex-row justify-center">
                  <Text className="text-[11.5px] text-muted-foreground">
                    No code?{" "}
                  </Text>
                  <Pressable onPress={() => setTab("search")}>
                    <Text className="text-[11.5px] font-semibold text-foreground underline">
                      Find a coach instead
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              {filtered.length === 0 ? (
                <View className="rounded-2xl bg-secondary p-6">
                  <Text className="text-center text-[13px] text-muted-foreground">
                    No coaches match — try clearing filters.
                  </Text>
                </View>
              ) : null}
              {filtered.map((c) => (
                <CoachCard
                  key={c.id}
                  coach={c}
                  requested={!!requested[c.id]}
                  onOpen={() => setProfile(c)}
                  onRequest={() => sendRequest(c)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Search footer */}
        {tab === "search" ? (
          <View className="flex-row items-center gap-3 border-t border-border/20 px-5 pt-3">
            <View className="flex-1">
              {totalRequested > 0 ? (
                <Text className="text-[12.5px] text-muted-foreground">
                  <Text className="font-bold text-foreground">
                    {totalRequested}
                  </Text>{" "}
                  request
                  {totalRequested > 1 ? "s" : ""} sent
                </Text>
              ) : (
                <Text className="text-[12.5px] text-muted-foreground">
                  Send up to 3 coaches a request
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => firstRequested && enterAppWith(firstRequested)}
              disabled={totalRequested === 0}
              className="h-12 items-center justify-center rounded-2xl bg-primary px-6 shadow-soft active:opacity-90 disabled:opacity-40"
            >
              <Text className="text-[14px] font-semibold text-primary-foreground">
                Continue
              </Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {profile ? (
        <CoachSheet
          coach={profile}
          requested={!!requested[profile.id]}
          onClose={() => setProfile(null)}
          onRequest={() => sendRequest(profile)}
        />
      ) : null}

      {sentTo ? (
        <View className="animate-fade-up absolute bottom-28 left-0 right-0 items-center">
          <View className="flex-row items-center gap-3 rounded-2xl bg-foreground px-4 py-3 shadow-pop">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-success">
              <Feather name="check" size={16} color="#ffffff" />
            </View>
            <Text className="text-[13px] font-semibold text-background">
              Request sent to {sentTo.name.split(" ")[0]}
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function ChipsLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-3 text-[12.5px] font-semibold text-foreground/80">
      {children}
    </Text>
  );
}

// Single-select (value/onChange) or multi-select (multiValue/onToggle) pill row.
function ChipsRow({
  options,
  value,
  onChange,
  multiValue,
  onToggle,
}: {
  options: string[];
  value?: string;
  onChange?: (v: string) => void;
  multiValue?: string[];
  onToggle?: (v: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const on = multiValue ? multiValue.includes(o) : value === o;
        return (
          <Pressable
            key={o}
            onPress={() => (onToggle ? onToggle(o) : onChange?.(o))}
            className={cn(
              "rounded-full border px-4 py-2 active:opacity-80",
              on ? "border-primary bg-primary" : "border-border bg-secondary"
            )}
          >
            <Text
              className={cn(
                "text-[13px] font-semibold",
                on ? "text-primary-foreground" : "text-foreground/80"
              )}
            >
              {o}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FilterChip({
  label,
  on,
  onPress,
}: {
  label: string;
  on?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 active:opacity-80",
        on ? "border-foreground bg-foreground" : "border-border bg-secondary"
      )}
    >
      <Text
        className={cn(
          "text-[12.5px] font-semibold",
          on ? "text-background" : "text-foreground/80"
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

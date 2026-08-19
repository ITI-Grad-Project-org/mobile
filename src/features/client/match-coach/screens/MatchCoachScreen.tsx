import { useBrowseDirectoryQuery } from "@/api/endpoints/directory.endpoints";
import {
  useCreateJoinRequestMutation,
  useListMyJoinRequestsQuery,
  useWithdrawJoinRequestMutation,
} from "@/api/endpoints/joinRequests.endpoints";
import {
  useConfirmOnboardingMutation,
  useValidateOnboardingMutation,
} from "@/api/endpoints/onboarding.endpoints";
import type { ProfileData } from "@/features/shared/setup";
import { FieldRenderer } from "@/features/shared/setup/components/FieldRenderer";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { markProfileComplete } from "@/shared/hooks/useProfileSetup";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
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
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView } from "react-native";

import { CoachCard } from "../components/CoachCard";
import { JoinRequestModal } from "../components/JoinRequestModal";
import { WithdrawRequestModal } from "../components/WithdrawRequestModal";
import { GOAL_STEPS } from "../config";
import { SPECIALTY_TAGS } from "../data";

type Tab = "invite" | "search";

const TABS = [
  { value: "invite" as const, label: "Invite code" },
  { value: "search" as const, label: "Find a coach" },
];

export function MatchCoachScreen() {
  const router = useRouter();

  // Goals & preferences collected on the invite-code confirmation step
  const [goalData, setGoalData] = useState<ProfileData>({});
  const setGoal = (k: string, v: unknown) =>
    setGoalData((d) => ({ ...d, [k]: v }));

  const [tab, setTab] = useState<Tab>("invite");

  // Invite flow state
  const [code, setCode] = useState("");
  const [codeOK, setCodeOK] = useState<any | null>(null);
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [days, setDays] = useState("4");
  const [level, setLevel] = useState("intermediate");
  const [focus, setFocus] = useState<string[]>(["strength"]);

  // API mutations & queries
  const [validateOnboarding, { isLoading: isValidatingCode }] =
    useValidateOnboardingMutation();
  const [confirmOnboarding, { isLoading: isConfirmingOnboarding }] =
    useConfirmOnboardingMutation();
  const [createJoinRequest] = useCreateJoinRequestMutation();
  const [withdrawJoinRequest] = useWithdrawJoinRequestMutation();
  const { data: myJoinRequests } = useListMyJoinRequestsQuery();

  // Search flow state
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [requested, setRequested] = useState<Record<string, boolean>>({});
  const [sentTo, setSentTo] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [requestingCoach, setRequestingCoach] = useState<any | null>(null);
  const [cancelingCoach, setCancelingCoach] = useState<{ coach: any; requestId: string } | null>(null);

  // Map pending join requests from API (tenantId -> requestId)
  const joinRequestMap = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(myJoinRequests)) {
      myJoinRequests.forEach((req: any) => {
        const tenantId = req.tenantId || req.tenant?.id;
        const reqId = req.id;
        if (tenantId && reqId && req.status !== "rejected") {
          map.set(tenantId, reqId);
        }
      });
    }
    return map;
  }, [myJoinRequests]);

  const isCoachRequested = (coach: any) => {
    if (!coach) return false;
    const id = coach.tenantId || coach.id;
    return Boolean(requested[id] || (id && joinRequestMap.has(id)));
  };

  const openCancelModal = (coach: any) => {
    if (!coach) return;
    const tenantId = coach.tenantId || coach.id;
    const reqId = joinRequestMap.get(tenantId) || tenantId;
    setCancelingCoach({ coach, requestId: reqId });
  };

  const openCoachProfile = (coach: any) => {
    const tenantId = coach?.tenantId || coach?.id;
    if (!tenantId) return;
    router.push({ pathname: "/coach/[tenantId]", params: { tenantId } });
  };

  // Live Coach Directory API query
  const {
    data: directoryData,
    isLoading: isDirectoryLoading,
    isError: isDirectoryError,
    refetch: refetchDirectory,
  } = useBrowseDirectoryQuery({
    search: q.trim() || undefined,
    specialty: filter ? (filter.toLowerCase() as any) : undefined,
  });

  const coachList: any[] = useMemo(() => {
    if (Array.isArray(directoryData)) return directoryData;
    if (directoryData && Array.isArray(directoryData.data)) return directoryData.data;
    if (directoryData && Array.isArray(directoryData.items)) return directoryData.items;
    return [];
  }, [directoryData]);

  const muted = useCSSVariable("--muted-foreground") as string;
  const lilacInk = useCSSVariable("--lilac-ink") as string;

  const enterAppWithCode = async () => {
    if (!codeOK) return;

    try {
      // Map level to Difficulty enum
      const difficulty = (
        level.toLowerCase() === "beginner"
          ? "beginner"
          : level.toLowerCase() === "advanced"
            ? "advanced"
            : "intermediate"
      ) as any;

      // Map goal
      const goal = (goalData.primaryGoal || "strength") as any;

      // Confirm onboarding on server
      await confirmOnboarding({
        code: code.trim(),
        intake: {
          goal,
          trainingExperience: difficulty,
          trainingDaysPerWeek: Number(days) || 4,
          focusAreas: focus as any[],
        },
      }).unwrap();

      await markProfileComplete({ ...goalData, code: code.trim(), days, level, focus });
      sfx.success();
      router.replace("/(client)/(tabs)/today");
    } catch (err: any) {
      sfx.error();
      const msg = err?.data?.message || err?.error || "Failed to confirm onboarding.";
      setCodeErr(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(client)/(tabs)/today");
  };

  const tryCode = async () => {
    if (!code.trim()) return;

    setCodeErr(null);

    try {
      const res = await validateOnboarding({ code: code.trim() }).unwrap();
      sfx.success();

      const tenantId = res?.tenantId || res?.tenant?.id || res?.id || "";
      const coachName =
        res?.coachName || res?.name || res?.businessName || "Your Coach";
      const businessName = res?.businessName || "";
      const avatarUrl = res?.avatarUrl || "";

      router.push({
        pathname: "/(setup)/intake",
        params: {
          code: code.trim(),
          tenantId,
          coachName,
          businessName,
          avatarUrl,
        },
      });
    } catch (err: any) {
      sfx.error();
      const msg =
        err?.data?.message || err?.error || "Invalid or expired invitation code.";
      setCodeErr(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  const openRequestModal = (coach: any) => {
    setRequestingCoach(coach);
  };

  const handleSendJoinRequest = async (coach: any, message: string) => {
    const tenantId = coach.tenantId || coach.id;
    if (!tenantId) return;

    await createJoinRequest({
      tenantId,
      message,
    }).unwrap();

    sfx.success();
    setRequested((r) => ({ ...r, [tenantId]: true }));
    setSentTo(coach);
  };

  const handleWithdrawJoinRequest = async (requestId: string) => {
    await withdrawJoinRequest({ id: requestId }).unwrap();
    sfx.success();
    if (cancelingCoach?.coach) {
      const tenantId = cancelingCoach.coach.tenantId || cancelingCoach.coach.id;
      if (tenantId) {
        setRequested((r) => ({ ...r, [tenantId]: false }));
      }
      const coachName = (cancelingCoach.coach.firstName || cancelingCoach.coach.name || "Coach").split(" ")[0];
      setToastMsg(`Join request to ${coachName} withdrawn`);
    }
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (!sentTo && !toastMsg) return;
    const id = setTimeout(() => {
      setSentTo(null);
      setToastMsg(null);
    }, 2200);
    return () => clearTimeout(id);
  }, [sentTo, toastMsg]);

  // ===== Invite: last step (days + level + focus + goals & preferences) =====
  if (codeOK) {
    const ready = Boolean(days && level);
    const coachName =
      codeOK?.coachName ||
      codeOK?.name ||
      codeOK?.businessName ||
      "Your Coach";
    const firstName = coachName.split(" ")[0];

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
            {codeOK?.avatarUrl ? (
              <Image
                source={{ uri: codeOK.avatarUrl }}
                className="h-14 w-14 rounded-2xl bg-secondary object-cover"
              />
            ) : (
              <View className="h-14 w-14 rounded-2xl bg-secondary items-center justify-center">
                <Icon name="person" size={26} color="--mint-ink" />
              </View>
            )}

            <View className="flex-1 min-w-0">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-mint-ink opacity-70">
                You&apos;re joining
              </Text>
              <Text className="text-[18px] font-bold text-mint-ink truncate" numberOfLines={1}>
                {coachName}
              </Text>
              {codeOK?.businessName ? (
                <Text className="text-[12px] text-mint-ink opacity-80" numberOfLines={1}>
                  {codeOK.businessName}
                </Text>
              ) : null}
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

          {GOAL_STEPS.map((step) => (
            <View key={step.title} className="mt-8">
              <Text className="text-[20px] font-bold text-foreground">
                {step.title}
              </Text>
              {step.subtitle ? (
                <Text className="mt-1 text-[13.5px] text-muted-foreground">
                  {step.subtitle}
                </Text>
              ) : null}
              <View className="mt-5 gap-5">
                {step.fields.map((f) => (
                  <FieldRenderer
                    key={f.key}
                    field={f}
                    value={goalData[f.key]}
                    onChange={(v) => setGoal(f.key, v)}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <View className="border-t border-border/60 px-5 pb-4 pt-3">
          <Pressable
            disabled={!ready || isConfirmingOnboarding}
            onPress={enterAppWithCode}
            className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90 disabled:opacity-50"
          >
            {isConfirmingOnboarding ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text className="text-[15px] font-semibold text-primary-foreground">
                Confirm & Join Tenant
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ===== Main Matcher Screen =====
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={10}
        style={{ flex: 1 }}
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
              <View className="flex-row items-center gap-x-2 rounded-2xl border border-border bg-secondary px-3.5 py-2.5">
                <Icon name="search" size={16} color="--muted-foreground" />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search coach name, specialty, location…"
                  placeholderTextColor={muted}
                  className="flex-1 bg-transparent text-[14px] text-foreground p-0"
                />
                {q.length > 0 ? (
                  <Pressable onPress={() => setQ("")} className="p-1">
                    <Icon name="x" size={14} color="--muted-foreground" />
                  </Pressable>
                ) : null}
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
                  <Icon name="sparkles" size={13} color={lilacInk} />
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lilac-ink opacity-80">
                    Invite code
                  </Text>
                </View>
                <Text className="mt-1 text-[13.5px] text-lilac-ink">
                  Got a 6-digit code from your coach? Enter it below to join their business directly.
                </Text>
              </Tone>

              <View className="rounded-3xl bg-card p-5 shadow-soft">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  6-Digit Invitation Code
                </Text>
                <TextInput
                  value={code}
                  onChangeText={(t) => {
                    setCode(t);
                    setCodeErr(null);
                  }}
                  placeholder="e.g. 482013"
                  placeholderTextColor={muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={10}
                  className="mt-1.5 rounded-2xl bg-secondary px-4 py-3.5 text-center text-[18px] font-bold uppercase tracking-[4px] text-foreground"
                />
                {codeErr ? (
                  <Text className="mt-2 text-[12px] font-medium text-destructive text-center">
                    {codeErr}
                  </Text>
                ) : null}

                <Pressable
                  onPress={tryCode}
                  disabled={!code.trim() || isValidatingCode}
                  className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90 disabled:opacity-50"
                >
                  {isValidatingCode ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text className="text-[14px] font-semibold text-primary-foreground">
                      Validate Code & Continue
                    </Text>
                  )}
                </Pressable>

                <View className="mt-3 flex-row justify-center">
                  <Text className="text-[11.5px] text-muted-foreground">
                    No code?{" "}
                  </Text>
                  <Pressable onPress={() => setTab("search")}>
                    <Text className="text-[11.5px] font-semibold text-foreground underline">
                      Find a coach in the directory
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              {isDirectoryLoading ? (
                <View className="py-12 items-center justify-center">
                  <ActivityIndicator size="large" />
                  <Text className="text-[13px] text-muted-foreground mt-3">
                    Searching coaches directory…
                  </Text>
                </View>
              ) : isDirectoryError ? (
                <View className="py-8 items-center justify-center rounded-2xl bg-destructive/10 p-4 border border-destructive/20">
                  <Text className="text-[13px] font-medium text-destructive">
                    Failed to load coach directory
                  </Text>
                  <Pressable
                    onPress={() => refetchDirectory()}
                    className="mt-3 rounded-xl bg-destructive px-4 py-2"
                  >
                    <Text className="text-[12px] font-semibold text-destructive-foreground">
                      Retry
                    </Text>
                  </Pressable>
                </View>
              ) : coachList.length === 0 ? (
                <View className="rounded-2xl bg-secondary p-8 items-center justify-center">
                  <Icon name="search" size={24} color="--muted-foreground" />
                  <Text className="mt-2 text-center text-[13.5px] font-semibold text-foreground">
                    No coaches found
                  </Text>
                  <Text className="mt-1 text-center text-[12px] text-muted-foreground">
                    Try adjusting your search query or clearing specialty filters.
                  </Text>
                </View>
              ) : (
                coachList.map((c: any) => {
                  const id = c.tenantId || c.id;
                  const isReq = isCoachRequested(c);

                  return (
                    <CoachCard
                      key={id}
                      coach={c}
                      requested={isReq}
                      onOpen={() => openCoachProfile(c)}
                      onRequest={() => openRequestModal(c)}
                      onCancelRequest={() => openCancelModal(c)}
                    />
                  );
                })
              )}
            </View>
          )}
        </ScrollView>

      </KeyboardAvoidingView>

      {/* Join Request Custom Message Modal */}
      {requestingCoach ? (
        <JoinRequestModal
          coach={requestingCoach}
          visible={requestingCoach !== null}
          onClose={() => setRequestingCoach(null)}
          onSubmit={(msg) => handleSendJoinRequest(requestingCoach, msg)}
        />
      ) : null}

      {/* Withdraw Request Modal */}
      {cancelingCoach ? (
        <WithdrawRequestModal
          coach={cancelingCoach.coach}
          requestId={cancelingCoach.requestId}
          visible={cancelingCoach !== null}
          onClose={() => setCancelingCoach(null)}
          onWithdraw={handleWithdrawJoinRequest}
        />
      ) : null}

      {/* Toast message after request is sent or withdrawn */}
      {sentTo || toastMsg ? (
        <View className="animate-fade-up absolute bottom-28 left-0 right-0 items-center">
          <View className="flex-row items-center gap-3 rounded-2xl bg-foreground px-4 py-3 shadow-pop">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-success">
              <Icon name="check" size={16} color="#ffffff" />
            </View>
            <Text className="text-[13px] font-semibold text-background">
              {toastMsg || `Request sent to ${(sentTo?.firstName || sentTo?.name || "Coach").split(" ")[0]}`}
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

import { useCreateIntakeMutation } from "@/api/endpoints/intake.endpoints";
import { useConfirmOnboardingMutation } from "@/api/endpoints/onboarding.endpoints";
import type {
  CreateClientIntakeDto,
  DietaryPreference,
  FocusArea,
  Goal,
  TrainingExperience,
  TrainingStyle,
} from "@/api/types";
import type { ProfileData } from "@/features/shared/setup";
import { FieldRenderer } from "@/features/shared/setup/components/FieldRenderer";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { markProfileComplete } from "@/shared/hooks/useProfileSetup";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { useAppDispatch, useAppSelector } from "@/store";
import { setActiveTenant } from "@/store/activeTenantSlice";
import { setMemberships } from "@/store/membershipsSlice";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { Tone } from "@/tw/Tone";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { ActivityIndicator } from "react-native";
import { GOAL_STEPS } from "../config";

const toEnumValue = (s: string) =>
  s.trim().toLowerCase().replace(/[\s-]+/g, "_");

export function ClientIntakeScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const activeTenantId = useAppSelector((state) => state.activeTenant.tenantId);

  const params = useLocalSearchParams<{
    code?: string;
    tenantId?: string;
    coachName?: string;
    businessName?: string;
    avatarUrl?: string;
  }>();

  const code = params.code || "";
  const targetTenantId = params.tenantId || activeTenantId || "";
  const coachName = params.coachName || "Your Coach";
  const businessName = params.businessName || "";
  const avatarUrl = params.avatarUrl || "";

  // State for Intake fields
  const [days, setDays] = useState("4");
  const [level, setLevel] = useState("Intermediate");
  const [focus, setFocus] = useState<string[]>(["Strength"]);
  const [goalData, setGoalData] = useState<ProfileData>({});
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const setGoal = (k: string, v: unknown) =>
    setGoalData((d) => ({ ...d, [k]: v }));

  const [createIntake, { isLoading: isCreatingIntake }] =
    useCreateIntakeMutation();
  const [confirmOnboarding, { isLoading: isConfirmingOnboarding }] =
    useConfirmOnboardingMutation();

  const isSubmitting = isCreatingIntake || isConfirmingOnboarding;

  const handleSubmit = async () => {
    setSubmitErr(null);

    // Map experience level to Difficulty enum
    const difficulty: TrainingExperience = (
      level.toLowerCase() === "beginner"
        ? "beginner"
        : level.toLowerCase() === "advanced"
          ? "advanced"
          : "intermediate"
    );

    // Map goal
    const rawGoal = (goalData.primaryGoal || goalData.goal || "strength") as string;
    let mappedGoal: Goal = "strength";
    if (rawGoal.includes("fat") || rawGoal.includes("Lose")) mappedGoal = "fat_loss";
    else if (rawGoal.includes("muscle") || rawGoal.includes("Build")) mappedGoal = "muscle_gain";
    else if (rawGoal.includes("Recomp")) mappedGoal = "recomposition";
    else if (rawGoal.includes("Endurance")) mappedGoal = "endurance";
    else if (rawGoal.includes("Yoga")) mappedGoal = "yoga_mobility";
    else if (rawGoal.includes("Wellness") || rawGoal.includes("health")) mappedGoal = "general_health";

    const intakeBody: CreateClientIntakeDto = {
      goal: mappedGoal,
      trainingExperience: difficulty,
      trainingDaysPerWeek: Number(days) || 4,
      focusAreas: focus.map(toEnumValue) as FocusArea[],
      trainingStyles: Array.isArray(goalData.trainingPrefs)
        ? (goalData.trainingPrefs.map(toEnumValue) as TrainingStyle[])
        : undefined,
      dietaryPreferences: Array.isArray(goalData.foodPrefs)
        ? (goalData.foodPrefs.map(toEnumValue) as DietaryPreference[])
        : undefined,
      injuries: goalData.injuries ? [String(goalData.injuries)] : undefined,
      medicalConditions: goalData.chronic ? [String(goalData.chronic)] : undefined,
      notes: goalData.notes ? String(goalData.notes) : undefined,
    };

    try {
      // 1. Confirm onboarding code with backend if code was provided
      if (code) {
        await confirmOnboarding({
          code,
          intake: intakeBody,
        }).unwrap();
      }

      // 2. Submit intake endpoint (POST /client/me/intake)
      if (targetTenantId) {
        await createIntake({
          body: intakeBody,
          tenantId: targetTenantId,
        }).unwrap();
      }

      // 3. Set active tenant in store & SecureStore
      if (targetTenantId) {
        dispatch(setActiveTenant(targetTenantId));
        await SecureStore.setItemAsync("activeTenantId", targetTenantId);

        dispatch(
          setMemberships([
            {
              tenantId: targetTenantId,
              tenantName: businessName || coachName,
              role: "client",
              status: "active",
            },
          ])
        );
      }

      await markProfileComplete({ ...goalData, code, days, level, focus });
      sfx.success();

      // Navigate to active client dashboard
      router.replace("/(client)/(tabs)/today");
    } catch (err: any) {
      sfx.error();
      const msg =
        err?.data?.message ||
        err?.error ||
        "Failed to submit intake. Please try again.";
      setSubmitErr(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  const firstName = coachName.split(" ")[0];
  const ready = Boolean(days && level);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <GlassButton
          onPress={() => router.back()}
          accessibilityLabel="Back"
          className="h-9 w-9 rounded-full"
        >
          <Icon name="chevron-left" size={18} color="--foreground" />
        </GlassButton>
        <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Client Intake
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
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
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
            <Text
              className="text-[18px] font-bold text-mint-ink truncate"
              numberOfLines={1}
            >
              {coachName}
            </Text>
            {businessName ? (
              <Text className="text-[12px] text-mint-ink opacity-80" numberOfLines={1}>
                {businessName}
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

        {submitErr ? (
          <View className="mt-4 rounded-2xl bg-destructive/10 border border-destructive/20 p-3">
            <Text className="text-[12.5px] font-medium text-destructive text-center">
              {submitErr}
            </Text>
          </View>
        ) : null}

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

      <View className="border-t border-border/60 px-5 pt-3">
        <Pressable
          disabled={!ready || isSubmitting}
          onPress={handleSubmit}
          className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text className="text-[15px] font-semibold text-primary-foreground">
              Submit Intake & Join
            </Text>
          )}
        </Pressable>
      </View>
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

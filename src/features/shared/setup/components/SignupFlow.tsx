import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView
} from "react-native";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "@/tw";
import type { ProfileData, Step } from "../types";
import { UploadPersonaProvider, type UploadPersona } from "../uploadContext";
import { FieldRenderer } from "./FieldRenderer";

const AnimatedView = Reanimated.createAnimatedComponent(View);

function saveErrorMessage(e: any): string {
  const body = e?.data;
  if (typeof body === "string" && body.trim()) return body;
  const msg = body?.message;
  if (Array.isArray(msg) && msg.length) return msg.join("\n"); // Nest validation
  if (typeof msg === "string" && msg.trim()) return msg;
  if (e?.status === "FETCH_ERROR" || e?.status === "PARSING_ERROR") {
    return `Couldn't reach the server${e?.error ? ` — ${e.error}` : ""}. Check your connection and try again.`;
  }
  if (typeof e?.status === "number") {
    return `Request failed (${e.status}). Please try again.`;
  }
  return e?.message || "Something went wrong. Please try again.";
}

function ProgressBar({ pct }: { pct: number }) {
  const p = useSharedValue(pct);
  useEffect(() => {
    p.value = withTiming(pct, { duration: 400 });
  }, [pct, p]);
  const style = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <AnimatedView style={style} className="h-full rounded-full bg-primary" />
    </View>
  );
}

export type SignupFlowProps = {
  title: string;
  steps: Step[];
  onClose: () => void;
  onSubmit?: (data: ProfileData) => void | Promise<void>;
  savingLabel?: string;
  onDone: (data: ProfileData) => void;
  showWelcome?: boolean;
  initialData?: ProfileData;
  welcomeTitle?: string;
  welcomeBody?: string;
  /** Which upload bucket the flow's image fields write to. */
  uploadPersona?: UploadPersona;
  /**
   * Safe-area edges the flow pads for. The default suits a root-level route
   * that owns the whole window; pass `["bottom"]` when the flow renders under
   * a header that already claimed the top inset, otherwise it's applied twice
   * and leaves an empty strip above the flow's own header.
   */
  edges?: React.ComponentProps<typeof SafeAreaView>["edges"];
};

export function SignupFlow({
  title,
  steps,
  onClose,
  onSubmit,
  savingLabel,
  onDone,
  showWelcome = true,
  initialData,
  welcomeTitle = "You're in.",
  welcomeBody = "Profile saved. Let's get you matched with the right coach.",
  uploadPersona = "client",
  edges = ["top", "bottom"],
}: SignupFlowProps) {
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [data, setData] = useState<ProfileData>(initialData ?? {});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const step = steps[idx];
  const isLast = idx === steps.length - 1;
  const pct = (idx + 1) / steps.length;

  const set = (k: string, v: unknown) => setData((d) => ({ ...d, [k]: v }));

  const finish = async () => {
    if (saving) return;
    Keyboard.dismiss();
    setSaveError(null);
    setSaving(true);
    try {
      await onSubmit?.(data);
    } catch (e: any) {
      setSaveError(saveErrorMessage(e));
      return;
    } finally {
      setSaving(false);
    }
    if (showWelcome) setDone(true);
    else onDone(data);
  };

  if (done && showWelcome) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center bg-background px-6"
        edges={edges}
      >
        <View className="items-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-success shadow-soft">
            <Icon name="check" size={40} color="#ffffff" />
          </View>
          <Text className="mt-5 text-center text-[26px] font-bold text-foreground">
            {welcomeTitle}
          </Text>
          <Text className="mt-1.5 max-w-xs text-center text-[13.5px] text-muted-foreground">
            {welcomeBody}
          </Text>
          <Pressable
            onPress={() => onDone(data)}
            className="mt-6 h-14 items-center justify-center rounded-2xl bg-primary px-10 shadow-soft active:opacity-90"
          >
            <Text className="text-[15px] font-semibold text-primary-foreground">
              Continue
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  if (done) return null;

  // Leaving a step always closes the keyboard first, so the next step's fields
  // are never hidden behind a keyboard opened for the previous one.
  const goPrev = () => {
    Keyboard.dismiss();
    setIdx((i) => i - 1);
  };
  const goBack = () => (idx === 0 ? onClose() : goPrev());
  // On the last step, Finish runs the save; earlier steps just advance.
  const goNext = () => {
    if (isLast) return finish();
    Keyboard.dismiss();
    setIdx((i) => i + 1);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={edges}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={10}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View className="gap-3 border-b border-border/60 px-4 pb-3 pt-2">
          <View className="flex-row items-center gap-3">
            <GlassButton
              onPress={goBack}
              accessibilityLabel="Back"
              className="h-9 w-9 rounded-full"
            >
              <Icon name="chevron-left" size={18} color="--foreground" />
            </GlassButton>
            <View className="min-w-0 flex-1">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {title}
              </Text>
              <Text className="text-[14px] font-semibold text-foreground">
                Step {idx + 1} of {steps.length}
              </Text>
            </View>
            <GlassButton onPress={onClose} className="rounded-full px-3.5 py-2">
              <Text className="text-[12px] font-semibold text-foreground">
                Cancel
              </Text>
            </GlassButton>
          </View>
          <ProgressBar pct={pct} />
        </View>

        {/* Body */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8 pt-6 grow"
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <View key={idx} className="animate-fade-up gap-6">
            <View className="gap-1">
              <Text className="text-[26px] font-bold text-foreground">
                {step.title}
              </Text>
              {step.subtitle ? (
                <Text className="text-[13.5px] text-muted-foreground">
                  {step.subtitle}
                </Text>
              ) : null}
            </View>

            <UploadPersonaProvider persona={uploadPersona}>
              <View className="gap-5">
                {step.fields.map((f) => (
                  <FieldRenderer
                    key={f.key}
                    field={f}
                    value={data[f.key]}
                    onChange={(v) => set(f.key, v)}
                  />
                ))}
              </View>
            </UploadPersonaProvider>
          </View>
        </ScrollView>

        {/* Footer */}
        <View className="border-t border-border/60 px-4 pb-4 pt-3">
          {saveError ? (
            <Text className="mb-2 text-center text-[12px] font-medium text-destructive">
              {saveError}
            </Text>
          ) : null}
          <View className="flex-row gap-3">
            {idx > 0 ? (
              <Pressable
                onPress={goPrev}
                disabled={saving}
                className="h-14 flex-1 items-center justify-center rounded-2xl bg-secondary active:opacity-90 disabled:opacity-60"
              >
                <Text className="text-[14px] font-semibold text-foreground">
                  Back
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={goNext}
              disabled={saving}
              className="h-14 flex-2 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90 disabled:opacity-60"
            >
              {saving ? <ActivityIndicator color="white" /> : null}
              <Text className="text-[14px] font-semibold text-primary-foreground">
                {saving && savingLabel ? savingLabel : isLast ? "Finish" : "Continue"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

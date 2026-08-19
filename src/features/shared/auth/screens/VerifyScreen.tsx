import { Feather } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  TextInput as RNTextInput,
} from "react-native";

import { cn } from "@/lib/utils";
import { hasOnboarded } from "@/shared/hooks/useOnboarding";
import { Pressable, SafeAreaView, ScrollView, Text, View, useCSSVariable } from "@/tw";

const LIQUID_GLASS = isLiquidGlassAvailable();
const CODE_LENGTH = 4;
const RESEND_SECONDS = 30;

type Role = "client" | "coach";

export function VerifyScreen() {
  const router = useRouter();
  const iconColor = useCSSVariable("--foreground");
  const params = useLocalSearchParams<{
    email?: string;
    role?: string;
    fname?: string;
    lname?: string;
  }>();
  const email = params.email ?? "your email";
  const role: Role = params.role === "coach" ? "coach" : "client";

  const inputRef = useRef<RNTextInput>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  const complete = code.length === CODE_LENGTH;

  // Resend cooldown ticker.
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const verify = () => {
    if (!complete || busy) return;
    setErr(null);
    setBusy(true);
    // v1: no backend — accept any 4-digit code and continue into the app.
    setTimeout(async () => {
      setBusy(false);
      if (role === "coach") {
        router.replace({
          pathname: "/(setup)/coach-profile",
          params: {
            email: params.email ?? "",
            fname: params.fname ?? "",
            lname: params.lname ?? "",
          },
        });
        return;
      }
      const onboarded = await hasOnboarded(params.email);
      if (onboarded) {
        router.replace("/(setup)/client-profile");
      } else {
        router.replace({
          pathname: "/(onboarding)/onboarding",
          params: {
            email: params.email ?? "",
            fname: params.fname ?? "",
            lname: params.lname ?? "",
          },
        });
      }
    }, 600);
  };

  const onChange = (v: string) => {
    const next = v.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(next);
    if (err) setErr(null);
    if (next.length === CODE_LENGTH) setTimeout(verify, 150);
  };

  const resend = () => {
    if (countdown > 0) return;
    setCode("");
    setErr(null);
    setCountdown(RESEND_SECONDS);
    inputRef.current?.focus();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={10}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8 pt-6 grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {LIQUID_GLASS ? (
            <GlassView
              glassEffectStyle="regular"
              isInteractive
              style={{ width: 44, height: 44, marginLeft: -8, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
            >
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                className="h-full w-full items-center justify-center rounded-full active:opacity-70"
                accessibilityLabel="Back"
              >
                <Feather name="arrow-left" size={22} color={iconColor} />
              </Pressable>
            </GlassView>
          ) : (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="h-11 w-11 -ml-2 items-center justify-center rounded-full bg-secondary active:opacity-70"
              accessibilityLabel="Back"
            >
              <Feather name="arrow-left" size={22} color={iconColor} />
            </Pressable>
          )}

          <View className="mt-4">
            <Text className="text-[30px] font-bold leading-tight text-foreground">
              Verify your account
            </Text>
            <Text className="mt-1.5 text-[14px] text-muted-foreground">
              Enter the 4-digit code we sent to{" "}
              <Text className="font-semibold text-foreground">{email}</Text>.
            </Text>
          </View>

          {/* Code boxes — one hidden input drives four visible cells. */}
          <Pressable onPress={() => inputRef.current?.focus()} className="mt-8">
            <View className="flex-row justify-between gap-3">
              {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                const char = code[i] ?? "";
                const active = i === code.length;
                return (
                  <View
                    key={i}
                    className={cn(
                      "h-16 flex-1 items-center justify-center rounded-2xl border-2 bg-secondary",
                      err
                        ? "border-destructive"
                        : char || active
                          ? "border-primary"
                          : "border-transparent"
                    )}
                  >
                    <Text className="text-[24px] font-bold text-foreground">{char}</Text>
                  </View>
                );
              })}
            </View>

            <RNTextInput
              ref={inputRef}
              value={code}
              onChangeText={onChange}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              autoFocus
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              style={{ position: "absolute", opacity: 0, height: 1, width: 1 }}
            />
          </Pressable>

          {err ? (
            <Text className="mt-3 text-[12px] font-medium text-destructive">{err}</Text>
          ) : null}

          <Pressable
            onPress={verify}
            disabled={!complete || busy}
            className="mt-6 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90 disabled:opacity-50"
          >
            {busy ? <ActivityIndicator color="white" /> : null}
            <Text className="text-[15px] font-semibold text-primary-foreground">
              Verify
            </Text>
          </Pressable>

          <View className="mt-5 flex-row items-center justify-center">
            <Text className="text-[13px] text-muted-foreground">
              Didn&apos;t get a code?{" "}
            </Text>
            {countdown > 0 ? (
              <Text className="text-[13px] font-semibold text-muted-foreground">
                Resend in {countdown}s
              </Text>
            ) : (
              <Pressable onPress={resend} hitSlop={8} className="active:opacity-70">
                <Text className="text-[13px] font-semibold text-foreground underline">
                  Resend code
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

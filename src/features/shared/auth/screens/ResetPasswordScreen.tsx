import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

import {
  useForgotPasswordCoachMutation,
  useForgotPasswordCustomerMutation,
  useResetPasswordCoachMutation,
  useResetPasswordCustomerMutation,
  useVerifyResetOtpCoachMutation,
  useVerifyResetOtpCustomerMutation,
} from "@/api/endpoints/auth.endpoints";
import { cn } from "@/lib/utils";
import { Pressable, SafeAreaView, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { PasswordField } from "../components/PasswordField";
import { getAuthErrorMessage } from "../utils/authError";

const LIQUID_GLASS = isLiquidGlassAvailable();
// Length of the reset code the backend emails. Adjust if the backend sends a
// different length (or a non-numeric token).
const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

type Role = "client" | "coach";

export function ResetPasswordScreen() {
  const router = useRouter();
  const iconColor = useCSSVariable("--foreground");
  const primaryColor = useCSSVariable("--primary");
  const params = useLocalSearchParams<{ email?: string; role?: string }>();
  const email = params.email ?? "";
  const role: Role = params.role === "coach" ? "coach" : "client";

  const [forgotCoach] = useForgotPasswordCoachMutation();
  const [forgotCustomer] = useForgotPasswordCustomerMutation();
  const [verifyOtpCoach] = useVerifyResetOtpCoachMutation();
  const [verifyOtpCustomer] = useVerifyResetOtpCustomerMutation();
  const [resetCoach] = useResetPasswordCoachMutation();
  const [resetCustomer] = useResetPasswordCustomerMutation();

  const inputRef = useRef<RNTextInput>(null);
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  const complete = code.length === CODE_LENGTH;
  const pwOk = newPw.length >= 8;
  const valid = complete && pwOk && newPw === confirmPw;

  // Resend cooldown ticker.
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const submit = async () => {
    if (busy) return;
    if (!complete) {
      setErr(`Enter the ${CODE_LENGTH}-digit code we emailed you.`);
      return;
    }
    if (!pwOk) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setErr("Passwords do not match.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      // 3-step OTP flow: exchange the code for a single-use resetToken, then
      // set the new password with it.
      const verifyOtp = role === "coach" ? verifyOtpCoach : verifyOtpCustomer;
      const reset = role === "coach" ? resetCoach : resetCustomer;
      const { resetToken } = await verifyOtp({ email, otp: code }).unwrap();
      await reset({ resetToken, newPassword: newPw }).unwrap();
      setDone(true);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setErr(getAuthErrorMessage(e, "reset"));
    } finally {
      setBusy(false);
    }
  };

  const onChangeCode = (v: string) => {
    const next = v.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(next);
    if (err) setErr(null);
  };

  const resend = async () => {
    if (countdown > 0 || !email) return;
    setCode("");
    setErr(null);
    setCountdown(RESEND_SECONDS);
    inputRef.current?.focus();
    try {
      const forgot = role === "coach" ? forgotCoach : forgotCustomer;
      await forgot({ email }).unwrap();
    } catch {
      // Non-blocking: the code entry stays usable even if resend fails.
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
              {done ? "Password updated" : "Enter reset code"}
            </Text>
            <Text className="mt-1.5 text-[14px] text-muted-foreground">
              {done
                ? "Your password has been reset. Sign in with your new password."
                : email
                  ? `Enter the ${CODE_LENGTH}-digit code sent to ${email} and choose a new password.`
                  : `Enter the ${CODE_LENGTH}-digit code we emailed you and choose a new password.`}
            </Text>
          </View>

          {done ? (
            <View className="mt-8 items-center gap-4">
              {LIQUID_GLASS ? (
                <GlassView
                  glassEffectStyle="regular"
                  style={{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" }}
                >
                  <Feather name="check" size={28} color={primaryColor} />
                </GlassView>
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Feather name="check" size={28} color={primaryColor} />
                </View>
              )}
              <Pressable
                onPress={() => router.replace("/(auth)/login")}
                className="mt-2 h-14 w-full flex-row items-center justify-center rounded-2xl bg-primary shadow-soft active:opacity-90"
              >
                <Text className="text-[15px] font-semibold text-primary-foreground">
                  Back to sign in
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Code boxes — one hidden input drives the visible cells. */}
              <Pressable onPress={() => inputRef.current?.focus()} className="mt-8">
                <View className="flex-row justify-between gap-2">
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
                  onChangeText={onChangeCode}
                  keyboardType="number-pad"
                  maxLength={CODE_LENGTH}
                  autoFocus
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  style={{ position: "absolute", opacity: 0, height: 1, width: 1 }}
                />
              </Pressable>

              <View className="mt-4 gap-3">
                <PasswordField
                  value={newPw}
                  onChangeText={(v) => {
                    setNewPw(v);
                    if (err) setErr(null);
                  }}
                  placeholder="New password (min. 8 characters)"
                />
                <PasswordField
                  value={confirmPw}
                  onChangeText={(v) => {
                    setConfirmPw(v);
                    if (err) setErr(null);
                  }}
                  placeholder="Confirm new password"
                />
              </View>

              {err ? (
                <Text className="mt-3 text-[12px] font-medium text-destructive">{err}</Text>
              ) : null}

              <Pressable
                onPress={submit}
                disabled={!valid || busy}
                className="mt-6 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90 disabled:opacity-50"
              >
                {busy ? <ActivityIndicator color="white" /> : null}
                <Text className="text-[15px] font-semibold text-primary-foreground">
                  Reset password
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
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

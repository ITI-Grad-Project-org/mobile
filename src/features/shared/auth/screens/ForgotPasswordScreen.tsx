import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";

import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

import {
  useForgotPasswordCoachMutation,
  useForgotPasswordCustomerMutation,
} from "@/api/endpoints/auth.endpoints";
import { Pressable, SafeAreaView, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { AuthField } from "../components/AuthField";
import { getAuthErrorMessage } from "../utils/authError";

const LIQUID_GLASS = isLiquidGlassAvailable();

type Role = "client" | "coach";

export function ForgotPasswordScreen() {
  const router = useRouter();
  const iconColor = useCSSVariable("--foreground");
  const params = useLocalSearchParams<{ role?: string }>();
  const role: Role = params.role === "coach" ? "coach" : "client";

  const [forgotCoach] = useForgotPasswordCoachMutation();
  const [forgotCustomer] = useForgotPasswordCustomerMutation();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async () => {
    if (!emailOk) {
      setErr("Please enter a valid email address.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const forgot = role === "coach" ? forgotCoach : forgotCustomer;
      await forgot({ email: email.trim() }).unwrap();
      router.push({
        pathname: "/(auth)/reset-password",
        params: { email: email.trim(), role },
      });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setErr(getAuthErrorMessage(e, "forgot"));
    } finally {
      setBusy(false);
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
              style={{ width: 34, height: 34, marginLeft: -8, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
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
              Reset password
            </Text>
            <Text className="mt-1.5 text-[14px] text-muted-foreground">
              Enter the email tied to your account and we&apos;ll send you a code
              to reset your password.
            </Text>
          </View>

          <View className="mt-8 gap-3">
            <AuthField
              icon="mail"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (err) setErr(null);
              }}
              placeholder="Email"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />

            {err ? (
              <Text className="text-[12px] font-medium text-destructive">{err}</Text>
            ) : null}

            <Pressable
              onPress={submit}
              disabled={!emailOk || busy}
              className="mt-2 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90 disabled:opacity-50"
            >
              {busy ? <ActivityIndicator color="white" /> : null}
              <Text className="text-[15px] font-semibold text-primary-foreground">
                Send reset code
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

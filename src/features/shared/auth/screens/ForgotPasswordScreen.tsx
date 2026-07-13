import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";

import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

import { Pressable, SafeAreaView, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { AuthField } from "../components/AuthField";

const LIQUID_GLASS = isLiquidGlassAvailable();

export function ForgotPasswordScreen() {
  const router = useRouter();
  const iconColor = useCSSVariable("--foreground");
  const primaryColor = useCSSVariable("--primary");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const valid = Boolean(email.trim());

  const submit = () => {
    if (!valid) return;
    // v1: no backend — optimistically confirm the reset email was queued.
    setSent(true);
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
              {sent
                ? "Check your inbox — we've sent a link to reset your password."
                : "Enter the email tied to your account and we'll send you a reset link."}
            </Text>
          </View>

          {sent ? (
            <View className="mt-8 items-center gap-4">
              {LIQUID_GLASS ? (
                <GlassView
                  glassEffectStyle="regular"
                  style={{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" }}
                >
                  <Feather name="mail" size={28} color={primaryColor} />
                </GlassView>
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Feather name="mail" size={28} color={primaryColor} />
                </View>
              )}
              <Text className="text-center text-[14px] text-muted-foreground">
                Sent to <Text className="font-semibold text-foreground">{email.trim()}</Text>
              </Text>
              <Pressable
                onPress={() => router.back()}
                className="mt-2 h-14 w-full flex-row items-center justify-center rounded-2xl bg-primary shadow-soft active:opacity-90"
              >
                <Text className="text-[15px] font-semibold text-primary-foreground">
                  Back to sign in
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-8 gap-3">
              <AuthField
                icon="mail"
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
              <Pressable
                onPress={submit}
                disabled={!valid}
                className="mt-2 h-14 flex-row items-center justify-center rounded-2xl bg-primary shadow-soft active:opacity-90 disabled:opacity-50"
              >
                <Text className="text-[15px] font-semibold text-primary-foreground">
                  Send reset link
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

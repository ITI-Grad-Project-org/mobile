import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";

import { hasOnboarded } from "@/shared/hooks/useOnboarding";
import { hasCompletedProfile } from "@/shared/hooks/useProfileSetup";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "@/tw";
import { AuthField } from "../components/AuthField";
import { GoogleButton } from "../components/GoogleButton";
import { PasswordField } from "../components/PasswordField";
import { RoleToggle, type AuthRole } from "../components/RoleToggle";

export type AuthMode = "signup" | "login";

export function AuthScreen({
  initialMode = "signup",
}: {
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<AuthRole>("client");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isSignup = mode === "signup";

  const valid = isSignup
    ? Boolean(fname.trim() && lname.trim() && email.trim() && pw.length >= 1)
    : Boolean(email.trim() && pw.length >= 1);

  const enterApp = () => {
    setBusy(true);
    setTimeout(async () => {
      setBusy(false);
      const profileDone = await hasCompletedProfile();

      if (role === "coach") {
        if (profileDone) {
          router.replace("/(coach)/(tabs)/home");
        } else {
          router.replace({
            pathname: "/(setup)/coach-profile",
            params: {
              email: email.trim(),
              fname: fname.trim(),
              lname: lname.trim(),
            },
          });
        }
        return;
      }

      // Client: run onboarding first, then profile setup, before the app.
      if (!(await hasOnboarded())) {
        router.replace("/(onboarding)/onboarding");
        return;
      }
      router.replace(
        profileDone ? "/(client)/(tabs)/today" : "/(setup)/client-profile"
      );
    }, 600);
  };

  const submit = () => {
    if (!valid) {
      setErr("Please fill all fields.");
      return;
    }
    setErr(null);
    // New accounts verify a 4-digit code first; returning users sign straight in.
    if (isSignup) {
      router.push({
        pathname: "/(auth)/verify",
        params: {
          email: email.trim(),
          role,
          fname: fname.trim(),
          lname: lname.trim(),
        },
      });
      return;
    }
    enterApp();
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
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <Text className="text-[30px] font-bold leading-tight text-foreground">
                {isSignup ? "Create your account" : "Welcome back"}
              </Text>
              <Text className="mt-1.5 text-[14px] text-muted-foreground">
                {isSignup
                  ? "Just the essentials — we'll set up the rest in a few quick steps."
                  : "Sign in to keep your streak alive."}
              </Text>
            </View>
          </View>

          <View className="mt-6">
            <RoleToggle role={role} onChange={setRole} />
          </View>

          <View className="mt-6">
            <GoogleButton onPress={enterApp} disabled={busy} />
          </View>

          <View className="my-5 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              or {isSignup ? "sign up" : "sign in"} with email
            </Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <View className="gap-3">
            {isSignup ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <AuthField
                    icon="user"
                    value={fname}
                    onChangeText={setFname}
                    placeholder="First name"
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="givenName"
                  />
                </View>
                <View className="flex-1">
                  <AuthField
                    icon="user"
                    value={lname}
                    onChangeText={setLname}
                    placeholder="Last name"
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="familyName"
                  />
                </View>
              </View>
            ) : null}

            <AuthField
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <PasswordField value={pw} onChangeText={setPw} />

            {!isSignup ? (
              <Pressable
                onPress={() => router.push("/(auth)/forgot-password")}
                className="-mt-1 self-end active:opacity-70"
              >
                <Text className="text-[13px] font-semibold text-foreground underline">
                  Forgot password?
                </Text>
              </Pressable>
            ) : null}

            {err ? (
              <Text className="text-[12px] font-medium text-destructive">
                {err}
              </Text>
            ) : null}

            <Pressable
              onPress={submit}
              disabled={!valid || busy}
              className="mt-2 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90 disabled:opacity-50"
            >
              {busy ? <ActivityIndicator color="white" /> : null}
              <Text className="text-[15px] font-semibold text-primary-foreground">
                {isSignup ? "Create account" : "Sign in"}
              </Text>
            </Pressable>
          </View>

          <View className="mt-5 flex-row justify-center">
            <Text className="text-[13px] text-muted-foreground">
              {isSignup ? "Already have an account? " : "New here? "}
            </Text>
            <Pressable
              onPress={() => {
                setErr(null);
                setMode(isSignup ? "login" : "signup");
              }}
            >
              <Text className="text-[13px] font-semibold text-foreground underline">
                {isSignup ? "Sign in" : "Create one"}
              </Text>
            </Pressable>
          </View>

          <Text className="mt-auto pt-8 text-center text-[11px] text-muted-foreground">
            By continuing you agree to UPLY&apos;s Terms &amp; Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from "react-native";

import { Pressable, SafeAreaView, ScrollView, Text, View } from "@/tw";
import { Image } from "@/tw/image";
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
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
    setTimeout(() => {
      setBusy(false);
      router.replace(
        role === "coach" ? "/(coach)/(tabs)/home" : "/(client)/(tabs)/today"
      );
    }, 600);
  };

  const submit = () => {
    if (!valid) {
      setErr("Please fill all fields.");
      return;
    }
    setErr(null);
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
            <Image
              source={
                !isDark
                  ? require("@/assets/images/Uply-dark-logo.png")
                  : require("@/assets/images/Uply-light-logo.png")
              }
              className="h-12 w-40 object-object"
            />
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
                <AuthField
                  icon="user"
                  value={fname}
                  onChangeText={setFname}
                  placeholder="First name"
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="givenName"
                />
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

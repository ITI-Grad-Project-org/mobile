import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";

import { hasOnboarded } from "@/shared/hooks/useOnboarding";
import {
  hasCompletedProfile,
  markProfileComplete,
  profileLooksComplete,
  resetProfile,
} from "@/shared/hooks/useProfileSetup";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "@/tw";
import { AuthField } from "../components/AuthField";
import { GoogleButton } from "../components/GoogleButton";
import { PasswordField } from "../components/PasswordField";
import { RoleToggle, type AuthRole } from "../components/RoleToggle";
import { getAuthErrorMessage } from "../utils/authError";
import { useGoogleAuth } from "../hooks/useGoogleAuth";

import {
  useGoogleCoachLoginMutation,
  useGoogleCustomerLoginMutation,
  useLazyGetCoachMeQuery,
  useLazyGetCustomerMembershipsQuery,
  useLoginCoachMutation,
  useLoginCustomerMutation,
  useRegisterCoachMutation,
  useRegisterCustomerMutation,
} from "@/api/endpoints/auth.endpoints";
import {
  useLazyGetClientProfileQuery,
  useLazyGetCoachProfileQuery,
} from "@/api/endpoints/profile.endpoints";
import { useAppDispatch } from "@/store";
import { setActiveTenant } from "@/store/activeTenantSlice";
import { saveTokens, setAuth, setEnteringApp } from "@/store/authSlice";
import { setMemberships } from "@/store/membershipsSlice";
import * as SecureStore from "expo-secure-store";

export type AuthMode = "signup" | "login";

export function AuthScreen({
  initialMode = "signup",
}: {
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [registerCoach] = useRegisterCoachMutation();
  const [registerCustomer] = useRegisterCustomerMutation();
  const [loginCoach] = useLoginCoachMutation();
  const [loginCustomer] = useLoginCustomerMutation();
  const [googleCoachLogin] = useGoogleCoachLoginMutation();
  const [googleCustomerLogin] = useGoogleCustomerLoginMutation();
  const [fetchCoachProfile] = useLazyGetCoachProfileQuery();
  const [fetchClientProfile] = useLazyGetClientProfileQuery();
  const [fetchCoachMe] = useLazyGetCoachMeQuery();
  const [fetchMemberships] = useLazyGetCustomerMembershipsQuery();

  const { signInWithGoogle } = useGoogleAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<AuthRole>("client");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isSignup = mode === "signup";
  const isCoach = role === "coach";

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const pwOk = pw.length >= 6;

  const valid = isSignup
    ? Boolean(
      fname.trim() &&
      lname.trim() &&
      (!isCoach || businessName.trim()) &&
      emailOk &&
      pwOk &&
      pw === confirmPw
    )
    : Boolean(emailOk && pw.length >= 1);

  // Resolve the active tenant BEFORE navigating into the app. Tenant-scoped
  // requests read `x-tenant-id` from the store, and the destination screens fire
  // theirs on mount — landing there with no active tenant caches empty/failed
  // results that never refetch once the tenant arrives.
  const primeActiveTenant = async (persona: "coach" | "customer") => {
    try {
      if (persona === "coach") {
        const me: any = await fetchCoachMe().unwrap();
        const tenantId = me?.currentTenant?.id || me?.tenant?.id;
        if (!tenantId) return;
        dispatch(
          setMemberships([
            {
              tenantId,
              tenantName:
                me?.currentTenant?.name || me?.businessName || "My Gym",
              role: "owner",
              status: "active",
            },
          ])
        );
        dispatch(setActiveTenant(tenantId));
        await SecureStore.setItemAsync("activeTenantId", tenantId);
        return;
      }

      const list: any[] = await fetchMemberships().unwrap();
      if (!list?.length) return;
      dispatch(setMemberships(list));
      const active: any = list.find((m: any) => m.status === "active") || list[0];
      const tenantId = active?.tenantId || active?.tenant?.id || active?.id;
      if (tenantId) {
        dispatch(setActiveTenant(tenantId));
        await SecureStore.setItemAsync("activeTenantId", tenantId);
      }
    } catch (e) {
      // A client with no coach yet legitimately has no tenant; the root layout
      // retries this once the app is mounted.
      console.warn("Could not resolve active tenant after login:", e);
    }
  };

  /**
   * Shared post-login flow: persist tokens → prime tenant → check profile →
   * dispatch auth state → navigate to the correct screen.
   *
   * Used by both email login/signup AND Google sign-in so the logic stays in
   * one place.
   */
  const handlePostLogin = async (
    loginRes: any,
    activeRole: AuthRole,
    fallbackUser?: { email?: string; fname?: string; lname?: string }
  ) => {
    const { accessToken, refreshToken, user } = loginRes;
    if (!accessToken || !refreshToken) {
      setErr("Invalid authentication response from server.");
      return;
    }

    const userEmail = user?.email || fallbackUser?.email || email.trim();
    const userFname = user?.firstName || fallbackUser?.fname || fname.trim();
    const userLname = user?.lastName || fallbackUser?.lname || lname.trim();

    const persona = activeRole === "coach" ? "coach" : "customer";

    // Raise the branded splash for the whole entry: the tenant prime, the
    // profile fetch and the redirect all happen behind it. Cleared in a
    // `finally` so a throw anywhere below can never leave the overlay stuck up.
    dispatch(setEnteringApp(true));
    try {
      await saveTokens(accessToken, refreshToken, persona, userEmail);
      await primeActiveTenant(persona);

      let profileDone = false;
      try {
        const serverProfile =
          activeRole === "coach"
            ? await fetchCoachProfile().unwrap()
            : await fetchClientProfile().unwrap();
        profileDone = profileLooksComplete(serverProfile, persona);
      } catch (e) {
        console.warn("Could not fetch server profile on login:", e);
        profileDone = false;
      }

      if (profileDone) {
        await markProfileComplete();
      } else {
        await resetProfile();
      }

      dispatch(
        setAuth({
          userId: user?.id || "user-id",
          persona,
          profileCompleted: profileDone,
        })
      );

      if (activeRole === "coach") {
        if (profileDone) {
          router.replace("/(coach)/(tabs)/home");
        } else {
          router.replace({
            pathname: "/(setup)/coach-profile",
            params: {
              email: userEmail,
              fname: userFname,
              lname: userLname,
            },
          });
        }
      } else {
        // Client flow: onboarding -> profile setup -> match-coach.
        if (profileDone) {
          router.replace("/(client)/(tabs)/today");
        } else if (!(await hasOnboarded(userEmail))) {
          router.replace({
            pathname: "/(onboarding)/onboarding",
            params: {
              email: userEmail,
              fname: userFname,
              lname: userLname,
            },
          });
        } else {
          router.replace({
            pathname: "/(setup)/client-profile",
            params: {
              email: userEmail,
              fname: userFname,
              lname: userLname,
            },
          });
        }
      }
    } finally {
      dispatch(setEnteringApp(false));
    }
  };

  const handleGoogleSignIn = async () => {
    setErr(null);
    setGoogleBusy(true);

    try {
      const result = await signInWithGoogle();
      if (!result) {
        // User cancelled — silently return.
        setGoogleBusy(false);
        return;
      }

      const loginRes =
        role === "coach"
          ? await googleCoachLogin({ idToken: result.idToken }).unwrap()
          : await googleCustomerLogin({ idToken: result.idToken }).unwrap();

      await handlePostLogin(loginRes, role, {
        email: result.user?.email || undefined,
        fname: result.user?.givenName || undefined,
        lname: result.user?.familyName || undefined,
      });
    } catch (e: any) {
      if (e?.name === "AbortError") {
        return;
      }
      console.warn("Google sign-in error:", e);
      setErr(
        e?.message || getAuthErrorMessage(e, "login")
      );
    } finally {
      setGoogleBusy(false);
    }
  };

  const submit = async () => {
    if (isSignup) {
      if (!fname.trim() || !lname.trim()) {
        setErr("Please enter your first and last name.");
        return;
      }
      if (isCoach && !businessName.trim()) {
        setErr("Please enter your business name.");
        return;
      }
      if (!emailOk) {
        setErr("Please enter a valid email address.");
        return;
      }
      if (!pwOk) {
        setErr("Password must be at least 6 characters.");
        return;
      }
      if (pw !== confirmPw) {
        setErr("Passwords do not match.");
        return;
      }
    } else if (!valid) {
      setErr("Please enter your email and password.");
      return;
    }
    setErr(null);
    setBusy(true);

    try {
      if (isSignup) {
        if (role === "coach") {
          await registerCoach({
            firstName: fname.trim(),
            lastName: lname.trim(),
            email: email.trim(),
            password: pw,
            confirmPassword: confirmPw,
            businessName: businessName.trim(),
          }).unwrap();
        } else {
          await registerCustomer({
            firstName: fname.trim(),
            lastName: lname.trim(),
            email: email.trim(),
            password: pw,
            confirmPassword: confirmPw,
          }).unwrap();
        }
        await resetProfile();
      }

      // Login to obtain authentication tokens
      let loginRes;
      if (role === "coach") {
        loginRes = await loginCoach({
          email: email.trim(),
          password: pw,
        }).unwrap();
      } else {
        loginRes = await loginCustomer({
          email: email.trim(),
          password: pw,
        }).unwrap();
      }

      await handlePostLogin(loginRes, role);
    } catch (e: any) {
      if (e?.name === "AbortError") {
        return;
      }
      console.warn("Auth mutation error:", e);
      setErr(getAuthErrorMessage(e, isSignup ? "signup" : "login"));
    } finally {
      setBusy(false);
    }
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
            <GoogleButton
              onPress={handleGoogleSignIn}
              disabled={busy}
              loading={googleBusy}
            />
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

            {isSignup && isCoach ? (
              <AuthField
                icon="briefcase"
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Business name"
                autoCapitalize="words"
                textContentType="organizationName"
              />
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

            <PasswordField
              value={pw}
              onChangeText={setPw}
              placeholder={isSignup ? "Password (min. 6 characters)" : "Password"}
            />

            {isSignup ? (
              <PasswordField
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder="Confirm password"
              />
            ) : null}

            {!isSignup ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(auth)/forgot-password",
                    params: { role },
                  })
                }
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
              disabled={!valid || busy || googleBusy}
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
                setFname("");
                setLname("");
                setBusinessName("");
                setEmail("");
                setPw("");
                setConfirmPw("");
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

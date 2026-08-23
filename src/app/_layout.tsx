import "@/global.css";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from 'react-redux';
import * as SecureStore from 'expo-secure-store';

import { store, useAppDispatch, useAppSelector } from '@/store';
import { setAuth, setLoading } from '@/store/authSlice';
import { setActiveTenant } from '@/store/activeTenantSlice';
import { setMemberships } from '@/store/membershipsSlice';
import { AnimatedSplash } from "@/shared/components/AnimatedSplash";
import {
  useGetCoachMeQuery,
  useGetCustomerMembershipsQuery,
} from '@/api/endpoints/auth.endpoints';
import { hasCompletedProfile } from '@/shared/hooks/useProfileSetup';
import { useTenantScopedToken } from '@/shared/hooks/useTenantScopedToken';
import { useAiEvents } from '@/features/shared/assistant';
import { useChatEvents } from '@/features/shared/messaging';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore — hiding may already be in progress on fast reloads.
});

function AppContent() {
  const dispatch = useAppDispatch();
  const [authRestored, setAuthRestored] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      try {
        const accessToken = await SecureStore.getItemAsync('accessToken');
        const persona = await SecureStore.getItemAsync('persona') as 'coach' | 'customer' | null;
        
        if (accessToken && persona) {
          const profileCompleted = await hasCompletedProfile();
          dispatch(setAuth({ userId: 'restored-user', persona, profileCompleted }));
          
          const savedTenantId = await SecureStore.getItemAsync('activeTenantId');
          if (savedTenantId) {
            dispatch(setActiveTenant(savedTenantId));
          }
        }
      } catch (e) {
        console.warn("Failed to restore session from SecureStore:", e);
      } finally {
        // Clear the "still restoring" flag even when there was no session, so
        // `auth.loading` never stays stuck true for a signed-out user.
        dispatch(setLoading(false));
        setAuthRestored(true);
      }
    }
    restoreSession();
  }, [dispatch]);


  const { isAuthenticated, persona, entering } = useAppSelector((state) => state.auth);
  const activeTenantId = useAppSelector((state) => state.activeTenant.tenantId);
  const tenantSwitching = useAppSelector((state) => state.activeTenant.switching);

  // Queries to load active tenant / memberships details.
  // `refetchOnMountOrArgChange` matters here: the login screen primes these via
  // lazy triggers, and if that call failed the cache holds an ERROR entry.
  // Subscribing to a cached error does not retry on its own, so without this the
  // active tenant would stay null for the whole session — every tenant-scoped
  // query skipped, Home reading "0 clients" until the app was restarted.
  const { data: coachMe, isLoading: loadingCoach } = useGetCoachMeQuery(undefined, {
    skip: !isAuthenticated || persona !== 'coach',
    refetchOnMountOrArgChange: true,
  });

  const { data: memberships, isLoading: loadingMemberships } = useGetCustomerMembershipsQuery(undefined, {
    skip: !isAuthenticated || persona !== 'customer',
    refetchOnMountOrArgChange: true,
  });

  // Safety net for a session that became authenticated with no active tenant —
  // a login whose tenant prime failed, or any path that navigates into the app
  // without priming. `restoreSession` only reads the persisted tenant once at
  // startup, so without this the session stays tenant-less (and every screen
  // renders empty) until the app is relaunched. The role effects below still
  // have the final say once /auth/me or /memberships answers.
  useEffect(() => {
    if (!authRestored || !isAuthenticated || activeTenantId) return;
    let cancelled = false;
    SecureStore.getItemAsync('activeTenantId')
      .then((savedTenantId) => {
        if (!cancelled && savedTenantId) {
          dispatch(setActiveTenant(savedTenantId));
        }
      })
      .catch(() => {
        // No persisted tenant: the role effects below are the only source left.
      });
    return () => {
      cancelled = true;
    };
  }, [authRestored, isAuthenticated, activeTenantId, dispatch]);

  // Set memberships and active tenant for coach.
  // Gated on `authRestored` so the SecureStore-persisted tenant (applied in
  // restoreSession) always wins — otherwise this could overwrite it in a race.
  useEffect(() => {
    if (!authRestored) return;
    if (coachMe) {
      const tenantId = coachMe.currentTenant?.id || coachMe.tenant?.id;
      if (tenantId) {
        dispatch(setMemberships([{
          tenantId,
          tenantName: coachMe.currentTenant?.name || coachMe.businessName || 'My Gym',
          role: 'owner',
          status: 'active'
        }]));
        if (activeTenantId !== tenantId) {
          dispatch(setActiveTenant(tenantId));
          SecureStore.setItemAsync('activeTenantId', tenantId);
        }
      }
    }
  }, [authRestored, coachMe, activeTenantId, dispatch]);

  // Set memberships and active tenant for customer.
  // Gated on `authRestored` so the persisted tenant is applied first; we only
  // auto-pick a tenant when there is no valid active one. This keeps the same
  // tenant across logout/login, so tenant-scoped data (e.g. measurements) is
  // read under the tenant it was saved with instead of a racy default.
  useEffect(() => {
    if (!authRestored) return;
    if (memberships && memberships.length > 0) {
      dispatch(setMemberships(memberships));

      const tenantIds = memberships
        .map((m: any) => m?.tenantId || m?.tenant?.id || m?.id)
        .filter(Boolean);
      const activeIsValid = activeTenantId && tenantIds.includes(activeTenantId);

      if (!activeIsValid) {
        const activeM: any = memberships.find((m: any) => m.status === 'active') || memberships[0];
        const tenantId = activeM?.tenantId || activeM?.tenant?.id || activeM?.id;
        if (tenantId) {
          dispatch(setActiveTenant(tenantId));
          SecureStore.setItemAsync('activeTenantId', tenantId);
        }
      }
    }
  }, [authRestored, memberships, activeTenantId, dispatch]);

  // Switching tenants must look and behave like a cold start: every screen is
  // torn down and remounted so nothing keeps rendering the previous tenant's
  // data (the RTK Query cache is reset in useSwitchCoach, but screens can hold
  // derived local state, and a mounted navigator would otherwise survive).
  // Adjusted during render (not in an effect) so the remount and the splash
  // land in the same commit as the tenant change — no frame of stale UI.
  const [tenantView, setTenantView] = useState({ id: activeTenantId, epoch: 0 });
  if (tenantView.id !== activeTenantId) {
    setTenantView((prev) => ({
      id: activeTenantId,
      // Only a real switch remounts — not the initial null -> tenant assignment.
      epoch: prev.id && activeTenantId ? prev.epoch + 1 : prev.epoch,
    }));
  }

  // Bring the branded splash back for the duration of the switch.
  const [wasSwitching, setWasSwitching] = useState(tenantSwitching);
  if (wasSwitching !== tenantSwitching) {
    setWasSwitching(tenantSwitching);
    if (tenantSwitching) setSplashDone(false);
  }

  // Same for a fresh login: the overlay goes up the moment the credentials are
  // accepted and only fades once the destination screen has been routed to, so
  // the login form never flashes back before the app appears.
  const [wasEntering, setWasEntering] = useState(entering);
  if (wasEntering !== entering) {
    setWasEntering(entering);
    if (entering) setSplashDone(false);
  }

  // A client whose token predates joining their coach carries no tenant, and
  // every /client/me/* route rejects it. Re-scope before the screens read.
  useTenantScopedToken();

  // One app-wide chat socket. It lives here rather than on the chat screens so
  // inbox rows and tab badges stay live from any tab.
  useChatEvents();

  // Likewise for the assistant, and for a sharper reason: an answer arrives
  // seconds after the ask, and a reply whose socket handler was unmounted by a
  // tab change is gone for good — rooms don't survive and nothing is persisted.
  useAiEvents();

  useEffect(() => {
    if (!authRestored || isAuthenticated) return;
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace('/(auth)/login');
  }, [authRestored, isAuthenticated]);

  // Hide the native splash from an effect, not from onLayout: the tree below
  // mounts once and its onLayout would not fire again when these queries later
  // settle, which would leave the splash up forever.
  useEffect(() => {
    if (authRestored && !loadingCoach && !loadingMemberships) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [authRestored, loadingCoach, loadingMemberships]);

  if (!authRestored) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack key={tenantView.epoch} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(setup)" />
        <Stack.Screen name="(coach)" />
        <Stack.Screen name="(client)" />
        <Stack.Screen name="my-profile" />
        <Stack.Screen name="coach/[tenantId]" />
      </Stack>
      {(!splashDone || tenantSwitching || entering) && (
        <AnimatedSplash
          hold={tenantSwitching || entering}
          onFinish={() => setSplashDone(true)}
        />
      )}
    </View>
  );
}


export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <AppContent />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}

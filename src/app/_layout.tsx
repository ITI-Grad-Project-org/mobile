import "@/global.css";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from 'react-redux';
import * as SecureStore from 'expo-secure-store';

import { store, useAppDispatch, useAppSelector } from '@/store';
import { setAuth } from '@/store/authSlice';
import { setActiveTenant } from '@/store/activeTenantSlice';
import { setMemberships } from '@/store/membershipsSlice';
import { AnimatedSplash } from "@/shared/components/AnimatedSplash";
import {
  useGetCoachMeQuery,
  useGetCustomerMembershipsQuery,
} from '@/api/endpoints/auth.endpoints';
import { hasCompletedProfile } from '@/shared/hooks/useProfileSetup';

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
        setAuthRestored(true);
      }
    }
    restoreSession();
  }, [dispatch]);


  const { isAuthenticated, persona } = useAppSelector((state) => state.auth);
  const activeTenantId = useAppSelector((state) => state.activeTenant.tenantId);

  // Queries to load active tenant / memberships details
  const { data: coachMe, isLoading: loadingCoach, isSuccess: coachSuccess } = useGetCoachMeQuery(undefined, {
    skip: !isAuthenticated || persona !== 'coach',
  });

  const { data: memberships, isLoading: loadingMemberships, isSuccess: membershipsSuccess } = useGetCustomerMembershipsQuery(undefined, {
    skip: !isAuthenticated || persona !== 'customer',
  });

  // Set memberships and active tenant for coach
  useEffect(() => {
    if (coachMe) {
      const tenantId = coachMe.currentTenant?.id || coachMe.tenant?.id;
      if (tenantId) {
        dispatch(setActiveTenant(tenantId));
        SecureStore.setItemAsync('activeTenantId', tenantId);
        
        dispatch(setMemberships([{
          tenantId,
          tenantName: coachMe.currentTenant?.name || coachMe.businessName || 'My Gym',
          role: 'owner',
          status: 'active'
        }]));
      }
    }
  }, [coachMe, dispatch]);

  // Set memberships and active tenant for customer
  useEffect(() => {
    if (memberships) {
      dispatch(setMemberships(memberships));
      
      if (!activeTenantId && memberships.length === 1) {
        const firstTenantId = memberships[0].tenantId;
        dispatch(setActiveTenant(firstTenantId));
        SecureStore.setItemAsync('activeTenantId', firstTenantId);
      }
    }
  }, [memberships, activeTenantId, dispatch]);

  const handleRootLayout = useCallback(() => {
    if (authRestored && !loadingCoach && !loadingMemberships) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [authRestored, loadingCoach, loadingMemberships]);

  // Determine if the local Redux state is still syncing with loaded profile/membership data
  const hasTenantInCoachQuery = coachMe && (coachMe.currentTenant?.id || coachMe.tenant?.id);
  const hasMembershipsInQuery = memberships && memberships.length > 0;

  const isSyncing = isAuthenticated && (
    (persona === 'coach' && coachSuccess && hasTenantInCoachQuery && !activeTenantId) ||
    (persona === 'customer' && membershipsSuccess && hasMembershipsInQuery && !activeTenantId)
  );

  // Wait until session is restored, queries are checked, and activeTenant is synced
  const isInitialLoading = !authRestored || (isAuthenticated && (loadingCoach || loadingMemberships || isSyncing));

  if (isInitialLoading) {
    return null;
  }


  return (
    <View style={{ flex: 1 }} onLayout={handleRootLayout}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(setup)" />
        <Stack.Screen name="(coach)" />
        <Stack.Screen name="(client)" />
      </Stack>
      {!splashDone && (
        <AnimatedSplash onFinish={() => setSplashDone(true)} />
      )}
    </View>
  );
}


export default function RootLayout() {
  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar barStyle={"default"} />
          <AppContent />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}

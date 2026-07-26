import { useCallback, useState } from "react";
import * as SecureStore from "expo-secure-store";

import { baseApi } from "@/api/baseApi";
import { useSwitchTenantMutation } from "@/api/endpoints/auth.endpoints";
import { useAppDispatch, useAppSelector } from "@/store";
import { setActiveTenant } from "@/store/activeTenantSlice";
import { saveTokens } from "@/store/authSlice";

/**
 * Switches the active tenant (= active coach) for a client.
 *
 * switch-tenant is an auth endpoint: it returns a NEW token whose JWT encodes
 * the newly-active tenant. We MUST persist those tokens, otherwise every later
 * request still carries the old tenant and the switch only "takes" after a
 * re-login. Resolves once the switch is complete, so callers can await it
 * before firing a tenant-scoped request.
 */
export function useSwitchCoach() {
  const dispatch = useAppDispatch();
  const activeTenantId = useAppSelector((s) => s.activeTenant.tenantId);
  const [switchTenant] = useSwitchTenantMutation();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const switchCoach = useCallback(
    async (tenantId: string) => {
      if (tenantId === activeTenantId || switchingId) return;
      setSwitchingId(tenantId);
      try {
        const res: any = await switchTenant({ tenantId }).unwrap();
        if (res?.accessToken && res?.refreshToken) {
          await saveTokens(res.accessToken, res.refreshToken, "customer");
        }
        dispatch(setActiveTenant(tenantId));
        await SecureStore.setItemAsync("activeTenantId", tenantId);
        // New creds are in place; wipe the cache so every mounted query refetches
        // under the new tenant. (Doing this here — not via the mutation's
        // invalidatesTags — avoids refetching with the stale token.)
        dispatch(baseApi.util.resetApiState());
      } finally {
        setSwitchingId(null);
      }
    },
    [activeTenantId, switchingId, switchTenant, dispatch]
  );

  return { switchCoach, switchingId, activeTenantId };
}

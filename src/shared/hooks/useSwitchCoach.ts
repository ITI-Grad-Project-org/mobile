import { useCallback, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

import { baseApi } from "@/api/baseApi";
import { bumpTenantEpoch } from "@/api/tenantEpoch";
import { reconnectAiSocket } from "@/lib/aiSocket";
import { reconnectChatSocket } from "@/lib/chatSocket";
import { useSwitchTenantMutation } from "@/api/endpoints/auth.endpoints";
import { readTokenPair } from "@/api/tokenPair";
import { useAppDispatch, useAppSelector } from "@/store";
import { setActiveTenant, setTenantSwitching } from "@/store/activeTenantSlice";
import { saveTokens } from "@/store/authSlice";

export function useSwitchCoach() {
  const dispatch = useAppDispatch();
  const activeTenantId = useAppSelector((s) => s.activeTenant.tenantId);
  const [switchTenant] = useSwitchTenantMutation();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const switchCoach = useCallback(
    async (tenantId: string, options?: { resetNavigation?: boolean }) => {
      // Callers that switch as a side effect of an action they're about to run
      // on the current screen (CoachProfileScreen.ensureActive) opt out of the
      // navigation reset — being teleported mid-action would unmount them.
      const resetNavigation = options?.resetNavigation ?? true;
      if (tenantId === activeTenantId || switchingId) return;
      setSwitchingId(tenantId);
      // Raise the splash before the first network call so the old tenant's
      // screens are never visible while the swap is in flight.
      dispatch(setTenantSwitching(true));
      try {
        const res: any = await switchTenant({ tenantId }).unwrap();

        // EVERY endpoint resolves the tenant from the JWT — not one of the 124
        // documented routes reads `x-tenant-id`. So if the re-scoped tokens
        // don't get persisted, the switch is cosmetic: the UI says the new
        // coach while every request keeps returning the old one's data. Fail
        // loudly instead of leaving the session half-switched.
        const tokens = readTokenPair(res);
        if (!tokens) {
          throw new Error(
            `switch-tenant returned no token pair (keys: ${Object.keys(res ?? {}).join(", ") || "none"})`
          );
        }
        await saveTokens(tokens.accessToken, tokens.refreshToken, "customer");
        // From here on, anything still in flight was fetched as the old coach.
        bumpTenantEpoch();
        dispatch(setActiveTenant(tenantId));
        await SecureStore.setItemAsync("activeTenantId", tenantId);
        // New creds are in place; wipe the cache so every mounted query refetches
        // under the new tenant. (Doing this here — not via the mutation's
        // invalidatesTags — avoids refetching with the stale token.)
        dispatch(baseApi.util.resetApiState());

        // The tenant is encoded in the JWT, so the live chat socket is still
        // scoped to the OLD coach — reopen it with the new token. Deliberately
        // NOT awaited ahead of the state updates: a socket that hangs or
        // rejects must not be able to abort the switch and leave the app with
        // new tokens but a stale cache (which is exactly the failure where the
        // data only comes good after a manual app restart).
        reconnectChatSocket().catch(() => {
          // REST still works; the socket retries on its own.
        });
        // Same for the assistant: its JWT still names the old coach, and every
        // knowledge-base lookup is scoped from it. The thread itself is already
        // wiped by assistantSlice's setActiveTenant reset.
        reconnectAiSocket().catch(() => {
          // Reconnects on its own on the next ask.
        });

        // Pushed screens carry the OLD tenant's ids in their route params
        // (/program/[programId], /workout/[programDayId], /coach/[tenantId]).
        // Remounting them just refetches those dead ids, which is how training
        // in particular keeps showing the previous coach. Drop back to the tab
        // root so every id on screen is resolved fresh under the new token.
        if (resetNavigation) {
          if (router.canDismiss()) {
            router.dismissAll();
          }
          router.replace("/(client)/(tabs)/today");
        }
      } finally {
        setSwitchingId(null);
        dispatch(setTenantSwitching(false));
      }
    },
    [activeTenantId, switchingId, switchTenant, dispatch]
  );

  return { switchCoach, switchingId, activeTenantId };
}

import { useCallback, useEffect, useRef } from "react";
import * as SecureStore from "expo-secure-store";

import { baseApi } from "@/api/baseApi";
import { useSwitchTenantMutation } from "@/api/endpoints/auth.endpoints";
import { tokenTenantId } from "@/api/jwt";
import { readTokenPair } from "@/api/tokenPair";
import { reconnectAiSocket } from "@/lib/aiSocket";
import { reconnectChatSocket } from "@/lib/chatSocket";
import { useAppDispatch, useAppSelector } from "@/store";
import { saveTokens } from "@/store/authSlice";

/**
 * Keep a client's stored token scoped to the tenant the app is showing.
 *
 * EVERY tenant-scoped route resolves the tenant from the JWT, so a customer
 * token minted BEFORE they joined a coach carries no tenant — and the server
 * rejects it on `/client/me/*` with a 401 the moment memberships arrive and the
 * UI starts reading. Nothing in the app fixed that except manually switching
 * coach from the profile screen: until then chat, training and nutrition all
 * 401 against a session that is otherwise perfectly valid, and every one of
 * those 401s used to spend a single-use refresh token.
 *
 * `switch-tenant` is the only route that re-scopes a token, so ask it for the
 * tenant we already believe is active. Mounted once, in `src/app/_layout.tsx`.
 */
export function useTenantScopedToken() {
  const dispatch = useAppDispatch();
  const persona = useAppSelector((s) => s.auth.persona);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const tenantId = useAppSelector((s) => s.activeTenant.tenantId);
  const switching = useAppSelector((s) => s.activeTenant.switching);
  const [switchTenant] = useSwitchTenantMutation();

  // One attempt per tenant per session: if the server hands back a token we
  // still can't read a tenant out of, retrying it on every render would be an
  // infinite loop of switch-tenant calls.
  const attempted = useRef<string | null>(null);

  const rescope = useCallback(
    async (target: string) => {
      const res = await switchTenant({ tenantId: target }).unwrap();
      const tokens = readTokenPair(res);
      if (!tokens) throw new Error("switch-tenant returned no token pair");
      await saveTokens(tokens.accessToken, tokens.refreshToken, "customer");
      // The tenant itself didn't change — no epoch bump, nothing to discard.
      // The cache is still full of the 401s the unscoped token produced, so
      // drop it and let the mounted screens read again on the good token.
      dispatch(baseApi.util.resetApiState());
      // Both sockets handshake with the token they captured at connect time,
      // and neither is worth failing the re-scope over — they retry on their own.
      reconnectChatSocket().catch(() => {
        // REST still works; the chat socket reconnects on its own.
      });
      reconnectAiSocket().catch(() => {
        // Reconnects on the next ask.
      });
    },
    [switchTenant, dispatch]
  );

  useEffect(() => {
    // Coach tokens are scoped to their one tenant at login and have no
    // switch-tenant route to re-scope with.
    if (!isAuthenticated || persona !== "customer" || !tenantId || switching) return;
    if (attempted.current === tenantId) return;

    let cancelled = false;
    (async () => {
      const token = await SecureStore.getItemAsync("accessToken");
      if (cancelled || !token) return;

      const scopedTo = tokenTenantId(token);
      // `undefined` = we couldn't read the token at all. Don't trade a token
      // that may be fine for one we asked for on a guess; the request that
      // actually fails will say so.
      if (scopedTo === undefined || scopedTo === tenantId) return;

      attempted.current = tenantId;
      try {
        await rescope(tenantId);
      } catch (e) {
        // Not fatal: the session stays signed in and the screens show their
        // own error states. A 403 here means the membership list and the
        // server disagree about this tenant, which is worth seeing in Metro.
        if (__DEV__) {
          console.warn(
            `[auth] could not re-scope token to tenant ${tenantId}:`,
            JSON.stringify(e).slice(0, 300)
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, persona, tenantId, switching, rescope]);
}

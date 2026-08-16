import { useGetClientsQuery } from "@/api/endpoints/clients.endpoints";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { useMemo } from "react";

/**
 * membershipId -> avatar URL, for surfaces that only get an id and a name.
 *
 * /analytics/activity rows carry `membershipId` and `clientName` and nothing
 * else — no avatar — so a face has to be looked up from the client list. That
 * list is already fetched by the Clients tab and by useCoachHomeData, so this
 * is a cache read in practice rather than an extra request.
 *
 * A missing entry is normal, not an error: the row may belong to a client who
 * has since been removed, and rows for clients with no uploaded photo have no
 * URL at all. Callers fall back to initials.
 */
export function useClientAvatars(): Map<string, string> {
  const { tenantId } = useActiveTenant();
  const clients = useGetClientsQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );

  return useMemo(() => {
    const map = new Map<string, string>();
    // The list is typed any[] and nests the user under `client` on some shapes,
    // so read both spellings — same treatment as useCoachHomeData.
    for (const row of (clients.data ?? []) as any[]) {
      const membershipId = row?.membershipId ?? row?.id;
      const avatarUrl = row?.client?.avatarUrl ?? row?.avatarUrl ?? row?.avatar;
      if (membershipId && avatarUrl) map.set(String(membershipId), String(avatarUrl));
    }
    return map;
  }, [clients.data]);
}

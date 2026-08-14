import { useGetClientsQuery } from "@/api/endpoints/clients.endpoints";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { useMemo } from "react";
import { buildClientIndex, type PlanClient } from "../lib/normalizePlan";

export interface CoachPlanClient {
  client: PlanClient | null;
  /** The roster row behind the client, for surfaces that take one. */
  rosterRow: any | null;
}

export function useCoachPlanClient(
  membershipId: string | null,
  embedded: PlanClient | null
): CoachPlanClient {
  const { tenantId } = useActiveTenant();

  // Skip the roster call entirely when the payload already answered.
  const needsLookup = Boolean(membershipId) && !embedded;
  const { data } = useGetClientsQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId || !needsLookup }
  );

  return useMemo(() => {
    const rosterRow =
      (data ?? []).find((row: any) => {
        const ids = [row?.id, row?.membershipId, row?.membership?.id];
        return ids.some((id) => id && String(id) === membershipId);
      }) ?? null;

    if (embedded) return { client: embedded, rosterRow };

    const client = membershipId
      ? (buildClientIndex(data).get(membershipId) ?? null)
      : null;

    return { client, rosterRow };
  }, [data, membershipId, embedded]);
}

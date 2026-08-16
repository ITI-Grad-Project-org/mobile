import { useGetClientsQuery } from "@/api/endpoints/clients.endpoints";
import { useGetCoachProfileQuery } from "@/api/endpoints/profile.endpoints";
import { resolveCoachFields } from "@/lib/coach";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import type { StackPerson } from "@/shared/ui/AvatarStack";
import { useCallback, useMemo } from "react";

import type { RosterClient } from "./useRosterCheckins";

export interface CoachHomeData {
  /** "Friday morning" — device clock, not the server. */
  greeting: string;
  /** First name for the header; empty when the profile hasn't loaded. */
  firstName: string;
  /** Faces for the roster strip, in the order the client list returned them. */
  roster: StackPerson[];
  /**
   * membershipId -> the client's USER id. /analytics/* speaks in memberships,
   * but /(coach)/chat/[id] wants the user id (see InboxScreen), so every deep
   * link off an attention row has to come through here.
   */
  clientUserIds: Map<string, string>;
  /** Roster rows that carry both ids — what the per-client reads need. */
  checkinTargets: RosterClient[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetchAll: () => void;
}

let loggedClientShape = false;

/**
 * Prints the client-list shape once. The list is typed `any[]` and nests the
 * user differently across shapes, so this is how you find the key holding the
 * USER id that /client/{clientId}/measurements wants — a membershipId there
 * comes back 404.
 *
 * Module-level rather than inline: the compiler forbids writing to an outer
 * binding from inside a hook.
 */
function describeRosterShape(rows: any[]): void {
  if (!__DEV__ || loggedClientShape || rows.length === 0) return;
  loggedClientShape = true;
  console.log("[roster] client row keys:", Object.keys(rows[0]).join(", "));
  console.log("[roster] first client row:", JSON.stringify(rows[0], null, 2));
}

function partOfDay(hour: number): string {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** The client list is typed `any[]` and nests the user under `client` on some
 *  shapes, so read both spellings rather than assuming one. */
function nameOf(row: any): string {
  const user = row?.client ?? row;
  const first = user?.firstName ?? row?.firstName ?? "";
  const last = user?.lastName ?? row?.lastName ?? "";
  const joined = `${first} ${last}`.trim();
  return joined || user?.name || row?.name || user?.email || row?.email || "Client";
}

/**
 * Identity and roster for the coach Home screen — the parts /analytics/*
 * doesn't answer. Every number on the screen comes from the analytics
 * endpoints instead (see useCoachHomeAnalytics); this hook is down to the
 * greeting, the avatars, and the membership -> user id lookup.
 */
export function useCoachHomeData(): CoachHomeData {
  const { tenantId } = useActiveTenant();
  const skip = { skip: !tenantId };

  const profile = useGetCoachProfileQuery(undefined, skip);
  // Usually already cached by the Clients tab.
  const clients = useGetClientsQuery({ tenantId: tenantId ?? "" }, skip);

  const coach = useMemo(() => resolveCoachFields(profile.data), [profile.data]);

  const greeting = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
    return `${weekday} ${partOfDay(now.getHours())}`;
  }, []);

  const roster = useMemo<StackPerson[]>(
    () =>
      (clients.data ?? []).map((row: any, i: number) => ({
        id: String(row?.membershipId ?? row?.id ?? i),
        name: nameOf(row),
        avatarUrl: row?.client?.avatarUrl ?? row?.avatarUrl ?? row?.avatar,
      })),
    [clients.data]
  );

  const checkinTargets = useMemo<RosterClient[]>(() => {
    const rows = (clients.data ?? []) as any[];
    describeRosterShape(rows);

    const targets: RosterClient[] = [];
    for (const row of rows) {
      const membershipId = row?.membershipId ?? row?.id;
      const clientId = row?.client?.id ?? row?.clientId ?? row?.userId;
      if (membershipId && clientId) {
        targets.push({
          clientId: String(clientId),
          membershipId: String(membershipId),
          name: nameOf(row),
          avatarUrl: row?.client?.avatarUrl ?? row?.avatarUrl ?? row?.avatar,
        });
      }
    }
    return targets;
  }, [clients.data]);

  const clientUserIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of (clients.data ?? []) as any[]) {
      const membershipId = row?.membershipId ?? row?.id;
      const userId = row?.client?.id ?? row?.clientId ?? row?.userId;
      if (membershipId && userId) map.set(String(membershipId), String(userId));
    }
    return map;
  }, [clients.data]);

  const refetchAll = useCallback(() => {
    if (!tenantId) return;
    profile.refetch();
    clients.refetch();
    // Refetch identities are stable per query, so this only re-creates when the
    // tenant changes — which is exactly when the caches change too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return {
    greeting,
    firstName: coach.firstName ?? "",
    roster,
    clientUserIds,
    checkinTargets,
    isLoading: !tenantId || profile.isLoading || clients.isLoading,
    isFetching: profile.isFetching || clients.isFetching,
    isError: profile.isError || clients.isError,
    refetchAll,
  };
}

import { measurementsEndpoints } from "@/api/endpoints/measurements.endpoints";
import { unwrapList } from "@/api/pagination";
import type { Measurement } from "@/api/types";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { useAppDispatch } from "@/store";
import { useEffect, useMemo, useState } from "react";

/**
 * Measurements across the roster, fetched one client at a time.
 *
 * There is no roster-wide measurements endpoint — only
 * GET /client/{clientId}/measurements — so anything that needs the whole roster
 * has to fan out. This is the single place that does it, shared by the Home
 * check-ins queue (one row each, recent window) and the Check-ins screen (full
 * history). Both cap the fan-out.
 */

export interface RosterClient {
  /** The client's USER id — what /client/{clientId}/measurements expects. */
  clientId: string;
  /** Carried through so a row can resolve a deep link like any other. */
  membershipId: string;
  name: string;
  avatarUrl?: string;
}

export interface ClientMeasurements {
  client: RosterClient;
  /** Newest first. */
  measurements: Measurement[];
}

export interface RosterMeasurementsOptions {
  enabled: boolean;
  /** Inclusive lower bound, YYYY-MM-DD. Omit for the client's whole history. */
  from?: string;
  /** Rows per client. */
  limit: number;
  /** Ceiling on the fan-out, so a large roster can't stampede a screen. */
  maxClients?: number;
}

/**
 * The client list is typed `any[]` and nests the user under `client` on some
 * shapes, so both spellings are read rather than one being assumed.
 */
export function rosterClientName(row: any): string {
  const user = row?.client ?? row;
  const first = user?.firstName ?? row?.firstName ?? "";
  const last = user?.lastName ?? row?.lastName ?? "";
  const joined = `${first} ${last}`.trim();
  return joined || user?.name || row?.name || user?.email || row?.email || "Client";
}

/**
 * Client-list rows -> the pair of ids every per-client read needs.
 *
 * Rows missing either id are dropped: /client/{clientId}/measurements 404s on a
 * membershipId, and /analytics/clients/{membershipId} 404s on a user id, so a
 * half-identified row can't be fetched either way.
 */
export function toRosterClients(rows: any[]): RosterClient[] {
  const targets: RosterClient[] = [];
  for (const row of rows) {
    const membershipId = row?.membershipId ?? row?.id;
    const clientId = row?.client?.id ?? row?.clientId ?? row?.userId;
    if (!membershipId || !clientId) continue;
    targets.push({
      clientId: String(clientId),
      membershipId: String(membershipId),
      name: rosterClientName(row),
      avatarUrl: row?.client?.avatarUrl ?? row?.avatarUrl ?? row?.avatar,
    });
  }
  return targets;
}

const DEFAULT_MAX_CLIENTS = 30;
/** Stable identity, so a disabled hook doesn't re-trigger downstream memos. */
const NONE: ClientMeasurements[] = [];

export function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Newest first; ties broken by createdAt so same-day entries stay ordered. */
function byNewest(a: Measurement, b: Measurement): number {
  if (a.measuredAt !== b.measuredAt) return a.measuredAt < b.measuredAt ? 1 : -1;
  return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
}

export function useRosterMeasurements(
  clients: RosterClient[],
  { enabled, from, limit, maxClients = DEFAULT_MAX_CLIENTS }: RosterMeasurementsOptions
) {
  const dispatch = useAppDispatch();
  const { tenantId } = useActiveTenant();
  // Results are stamped with the request that produced them, so "still
  // loading" is derived rather than a second state written from the effect.
  const [fetched, setFetched] = useState<{ key: string; rows: ClientMeasurements[] }>({
    key: "",
    rows: NONE,
  });

  // Re-run only when the request itself changes — an upstream useMemo's array
  // identity is not enough on its own.
  const rosterKey = useMemo(
    () =>
      clients
        .slice(0, maxClients)
        .map((client) => client.clientId)
        .join(","),
    [clients, maxClients]
  );
  const requestKey = `${tenantId ?? ""}|${from ?? ""}|${limit}|${rosterKey}`;

  useEffect(() => {
    // No setState on this path: the hook returns NONE while disabled, so
    // clearing here would be a redundant render (and an effect-phase write).
    if (!enabled || !tenantId || clients.length === 0) return;

    let cancelled = false;
    const targets = clients.slice(0, maxClients);

    const subscriptions = targets.map((client) =>
      dispatch(
        measurementsEndpoints.endpoints.listClientMeasurements.initiate({
          clientId: client.clientId,
          tenantId,
          limit,
          from,
        })
      )
    );

    Promise.all(
      subscriptions.map((subscription, i) =>
        subscription
          .unwrap()
          .then((payload) => ({ client: targets[i], payload }))
          // A 404 means that client isn't in this tenant; anything else is a
          // transient failure. Neither should blank the whole screen.
          .catch(() => null)
      )
    ).then((settled) => {
      if (cancelled) return;

      const rows: ClientMeasurements[] = [];
      for (const result of settled) {
        if (!result) continue;
        // Rows arrive under `docs`, not `data` — see src/api/pagination.ts.
        const measurements = unwrapList<Measurement>(result.payload)
          .filter((m) => typeof m?.measuredAt === "string")
          .slice()
          .sort(byNewest);
        rows.push({ client: result.client, measurements });
      }

      setFetched({ key: requestKey, rows: rows.length > 0 ? rows : NONE });
    });

    return () => {
      cancelled = true;
      // Release the cache subscriptions this fan-out created.
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
    // `clients` is covered by rosterKey, which requestKey is built from;
    // dispatch is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, enabled, maxClients]);

  return {
    data: enabled ? fetched.rows : NONE,
    // Loading until the results on hand were produced by THIS request.
    isLoading: enabled && clients.length > 0 && fetched.key !== requestKey,
  };
}

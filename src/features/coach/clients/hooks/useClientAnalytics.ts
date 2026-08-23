import {
  useGetAdherenceQuery,
  useGetClientProgressQuery,
} from "@/api/endpoints/analytics.endpoints";
import type { Adherence, Progress } from "@/api/types";
import { useMemo } from "react";

import { normalizeAdherence, normalizeProgress } from "../lib/normalizeClientAnalytics";

export interface ClientAnalytics {
  adherence?: Adherence;
  progress?: Progress;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Whether one client is actually training, for the coach's client sheet.
 *
 * Both reads are keyed by MEMBERSHIP id, not the client's user id — /analytics/*
 * speaks in memberships, and a user id here comes back 404. `tenantId` is an
 * RTK cache key only: analytics scopes every query by the tenant in the JWT and
 * the endpoints strip it before building params.
 *
 * No date window is sent. The endpoint defaults are what the sheet wants, and a
 * window would silently change which sessions "scheduled" counts.
 *
 * A 404 surfaces as `isError`, never as an empty state: the per-client route
 * 404s when the membership belongs to another tenant, and rendering that as
 * "no training data" would hide a wrong-tenant bug behind a plausible answer.
 */
export function useClientAnalytics(
  membershipId: string | undefined,
  tenantId: string | undefined
): ClientAnalytics {
  const skip = { skip: !membershipId || !tenantId };
  const arg = { membershipId: membershipId ?? "", tenantId: tenantId ?? "" };

  const adherence = useGetAdherenceQuery(arg, skip);
  const progress = useGetClientProgressQuery(arg, skip);

  return useMemo(
    () => ({
      adherence: normalizeAdherence(adherence.data),
      progress: normalizeProgress(progress.data),
      isLoading: adherence.isLoading || progress.isLoading,
      isError: adherence.isError || progress.isError,
    }),
    [
      adherence.data,
      adherence.isLoading,
      adherence.isError,
      progress.data,
      progress.isLoading,
      progress.isError,
    ]
  );
}

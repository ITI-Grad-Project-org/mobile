import { useGetClientsQuery } from "@/api/endpoints/clients.endpoints";
import { useListNutritionPlansQuery } from "@/api/endpoints/nutritionPlans.endpoints";
import { useListProgramsQuery } from "@/api/endpoints/programs.endpoints";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { useCallback, useMemo } from "react";
import type { StatusFilter } from "../components/PlanFilterSheet";
import {
  buildClientIndex,
  normalizePlan,
  type CoachPlan,
  type PlanKind,
} from "../lib/normalizePlan";

export type TypeFilter = PlanKind | "all";

export interface CoachPlanCounts {
  total: number;
  training: number;
  nutrition: number;
}

export interface UseCoachPlansArgs {
  /** Debounced search text — matched against plan and client name. */
  search: string;
  type: TypeFilter;
  status: StatusFilter;
}

export interface UseCoachPlansResult {
  /** Filtered rows, ready to render. */
  plans: CoachPlan[];
  /** Counts for the whole fetched set, unaffected by the type/status filters. */
  counts: CoachPlanCounts;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useCoachPlans({
  search,
  type,
  status,
}: UseCoachPlansArgs): UseCoachPlansResult {
  const { tenantId } = useActiveTenant();
  const skip = { skip: !tenantId };
  const args = useMemo(
    () => ({ tenantId: tenantId ?? "", isArchived: status === "archived" }),
    [tenantId, status]
  );

  const programs = useListProgramsQuery(args, skip);
  const nutrition = useListNutritionPlansQuery(args, skip);
  // Only to name the client on plans whose payload omits the embedded
  // membership — the Clients screen has this cached already.
  const clients = useGetClientsQuery({ tenantId: tenantId ?? "" }, skip);

  const all = useMemo(() => {
    const index = buildClientIndex(clients.data);

    const normalize = (rows: any[] | undefined, kind: PlanKind) =>
      (rows ?? [])
        .map((row) => {
          const membershipId = row?.membershipId ?? row?.membership?.id;
          const fallback = membershipId ? index.get(String(membershipId)) : undefined;
          return normalizePlan(row, kind, fallback);
        })
        .filter((plan): plan is CoachPlan => plan !== null);

    return [
      ...normalize(programs.data, "training"),
      ...normalize(nutrition.data, "nutrition"),
    ].sort((a, b) => b.sortKey - a.sortKey);
  }, [programs.data, nutrition.data, clients.data]);

  const counts = useMemo<CoachPlanCounts>(
    () => ({
      total: all.length,
      training: all.filter((p) => p.kind === "training").length,
      nutrition: all.filter((p) => p.kind === "nutrition").length,
    }),
    [all]
  );

  const plans = useMemo(() => filterPlans(all, { type, status, search }), [
    all,
    type,
    status,
    search,
  ]);

  const refetch = useCallback(() => {
    programs.refetch();
    nutrition.refetch();
  }, [programs, nutrition]);

  return {
    plans,
    counts,
    isLoading: programs.isLoading || nutrition.isLoading,
    isFetching: programs.isFetching || nutrition.isFetching,
    // The roster is a nicety — a failure there shouldn't blank the list.
    isError: programs.isError || nutrition.isError,
    refetch,
  };
}

/** Type + status + text filtering, applied to the merged list. */
export function filterPlans(
  plans: CoachPlan[],
  { type, status, search }: { type: TypeFilter; status: StatusFilter; search: string }
): CoachPlan[] {
  const needle = search.trim().toLowerCase();

  return plans.filter((plan) => {
    if (type !== "all" && plan.kind !== type) return false;
    if (status !== "all" && plan.lifecycle !== status) return false;
    if (!needle) return true;
    return (
      plan.name.toLowerCase().includes(needle) ||
      (plan.client?.name.toLowerCase().includes(needle) ?? false)
    );
  });
}

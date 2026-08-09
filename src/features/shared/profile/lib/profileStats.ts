/** `weight_loss` -> `Weight loss`. Used for the Specialty/Goal enums. */
export function humanizeEnum(value?: string | null): string | null {
  if (!value) return null;
  const spaced = String(value).replace(/_/g, " ").trim();
  if (!spaced) return null;
  return spaced[0].toUpperCase() + spaced.slice(1);
}

export interface ClientRosterStats {
  total: number;
  active: number;
}

/**
 * The roster rows come back either flat or nested under `client`, and the
 * status field drifts between `status` and `membershipStatus`. A row with no
 * status at all is counted as active — that matches the clients screen.
 */
export function deriveRosterStats(clients: any[] | undefined): ClientRosterStats {
  const list = clients ?? [];
  const active = list.filter((c: any) => {
    const status = String(c?.status || c?.membershipStatus || "active").toLowerCase();
    return status === "active";
  }).length;
  return { total: list.length, active };
}

/** `4.87` -> `4.9`. Returns null when there's nothing to show. */
export function formatRating(average: number | null | undefined): string | null {
  if (typeof average !== "number" || Number.isNaN(average)) return null;
  return average.toFixed(1);
}

/** The coach's public directory URL, when the tenant has a slug. */
export function publicProfileHandle(slug?: string | null): string | null {
  return slug ? `${slug}.uply.app` : null;
}

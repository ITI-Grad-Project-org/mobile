import * as SecureStore from "expo-secure-store";

/**
 * Per-exercise "done" ticks for one calendar day, shared by the Today checklist
 * and the live workout logger so logging a set ticks the box on Today.
 *
 * Keyed by day + tenant (a client can be in more than one tenant). The shape is
 * `{ [exerciseId]: true }`; ids may be either the prescribed-exercise id or the
 * logged-exercise id, so readers must look up by their own id rather than
 * counting entries.
 */
export type DayProgress = Record<string, boolean>;

export function dayProgressKey(dayIso: string, tenantId?: string | null): string {
  return `today_done_${dayIso}_${tenantId || "default"}`;
}

export function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export async function readDayProgress(key: string): Promise<DayProgress> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as DayProgress) : {};
  } catch {
    return {};
  }
}

export async function writeDayProgress(key: string, progress: DayProgress): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(progress));
  } catch {
    // Progress ticks are a convenience; a failed write must not break logging.
  }
}

/** Merges ticks in without dropping entries the other screen wrote. */
export async function mergeDayProgress(key: string, updates: DayProgress): Promise<void> {
  const current = await readDayProgress(key);
  await writeDayProgress(key, { ...current, ...updates });
}

/**
 * Last-resort lookup key. The workout log identifies an exercise by its logged
 * id, the Today checklist by its prescribed id, and there is no client endpoint
 * that returns both — so the name is written alongside the ids as a fallback.
 */
export function exerciseNameKey(name: string): string {
  return `name:${name.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

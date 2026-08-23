import * as SecureStore from "expo-secure-store";

export type DayProgress = Record<string, boolean>;

export function dayProgressKey(dayIso: string, tenantId?: string | null): string {
  return `today_done_${dayIso}_${tenantId || "default"}`;
}

export { todayIso } from "./date";

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

export function exerciseNameKey(name: string): string {
  return `name:${name.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

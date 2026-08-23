const COMPLETED = new Set(["completed", "done", "finalized"]);

/** The log embedded in a day, whichever domain it came from. */
function logOf(day: any): any {
  return day?.workoutLog ?? day?.nutritionLog ?? day?.log ?? null;
}

/** The day's log state, lowercased. "" when the payload reports none. */
export function dayLogState(day: any): string {
  return String(
    day?.logState ?? logOf(day)?.status ?? day?.status ?? ""
  ).toLowerCase();
}

export function isDayCompleted(day: any): boolean {
  const log = logOf(day);
  if (log) {
    if (COMPLETED.has(String(log.status ?? "").toLowerCase())) return true;
    if (log.completedAt || log.finishedAt) return true;
  }
  const state = String(day?.logState ?? day?.status ?? "").toLowerCase();
  if (COMPLETED.has(state)) return true;
  return Boolean(day?.completedAt);
}

export function isDaySkipped(day: any): boolean {
  return dayLogState(day) === "skipped";
}

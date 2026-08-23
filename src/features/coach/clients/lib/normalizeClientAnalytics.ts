import type { Adherence, Progress, ProgressMeasurement, StrengthSeries } from "@/api/types";
import { asRecord, pickList } from "@/shared/utils/analyticsPayload";

/** A number that must exist. Absent or non-numeric degrades to 0 rather than
 *  NaN, which would propagate into every derived figure on the card. */
function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** A Pct stays null when absent: no denominator is not zero. */
function pct(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** A nullable measurement reading. Absent and null both mean "not recorded". */
function reading(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeAdherence(raw: unknown): Adherence | undefined {
  const root = asRecord(raw);
  if (!root) return undefined;

  return {
    scheduledSessions: count(root.scheduledSessions),
    completedSessions: count(root.completedSessions),
    partialSessions: count(root.partialSessions),
    skippedSessions: count(root.skippedSessions),
    inProgressSessions: count(root.inProgressSessions),
    sessionCompletionPct: pct(root.sessionCompletionPct),
    comparableSets: count(root.comparableSets),
    prescribedVolume: count(root.prescribedVolume),
    actualVolume: count(root.actualVolume),
    // Genuinely null on the wire when comparableSets is 0 — the endpoint says
    // "not measurable this way" rather than guessing at 0%.
    volumeAdherencePct: pct(root.volumeAdherencePct),
    setsCompleted: count(root.setsCompleted),
    setsPartial: count(root.setsPartial),
    setsSkipped: count(root.setsSkipped),
    setsExtra: count(root.setsExtra),
  };
}

export function normalizeProgress(raw: unknown): Progress | undefined {
  const root = asRecord(raw);
  if (!root) return undefined;

  const measurements: ProgressMeasurement[] = pickList(root, ["measurements"]).map((item) => {
    const row = asRecord(item) ?? {};
    return {
      measuredOn: typeof row.measuredOn === "string" ? row.measuredOn : "",
      // Every reading stays nullable and is never carried forward.
      weightKg: reading(row.weightKg),
      bodyFatPct: reading(row.bodyFatPct),
      chestCm: reading(row.chestCm),
      waistCm: reading(row.waistCm),
      hipsCm: reading(row.hipsCm),
      armCm: reading(row.armCm),
      thighCm: reading(row.thighCm),
    };
  });

  const strength: StrengthSeries[] = pickList(root, ["strength"]).map((item) => {
    const row = asRecord(item) ?? {};
    return {
      exerciseName: typeof row.exerciseName === "string" ? row.exerciseName : "",
      firstE1rmKg: count(row.firstE1rmKg),
      latestE1rmKg: count(row.latestE1rmKg),
      bestE1rmKg: count(row.bestE1rmKg),
      changePct: pct(row.changePct),
      points: pickList(row, ["points"]).map((p) => {
        const point = asRecord(p) ?? {};
        return {
          date: typeof point.date === "string" ? point.date : "",
          bestE1rmKg: count(point.bestE1rmKg),
          sets: count(point.sets),
          volumeKg: count(point.volumeKg),
        };
      }),
    };
  });

  return {
    membershipId: typeof root.membershipId === "string" ? root.membershipId : "",
    clientName: typeof root.clientName === "string" ? root.clientName : "",
    from: typeof root.from === "string" ? root.from : "",
    to: typeof root.to === "string" ? root.to : "",
    measurements,
    strength,
  };
}

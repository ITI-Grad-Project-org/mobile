import type { Measurement } from "@/api/types";

/**
 * Measurement metric metadata — the shared data layer for a domain both UIs
 * read: the client sees their own history on Progress, the coach sees the
 * roster's on Check-ins. Screens stay per-UI; only this description of the
 * fields is shared.
 */

/** Numeric metric fields on a measurement that we track a trend for. */
export type MetricKey =
  | "weightKg"
  | "bodyFatPct"
  | "chestCm"
  | "waistCm"
  | "hipsCm"
  | "armCm"
  | "thighCm";

export type MetricMeta = {
  key: MetricKey;
  label: string;
  unit: string;
  /** true when a lower value is "good" (used to colour the delta pill). */
  lowerIsBetter: boolean;
};

export const METRICS: MetricMeta[] = [
  { key: "weightKg", label: "Weight", unit: "kg", lowerIsBetter: true },
  { key: "bodyFatPct", label: "Body fat", unit: "%", lowerIsBetter: true },
  { key: "waistCm", label: "Waist", unit: "cm", lowerIsBetter: true },
  { key: "chestCm", label: "Chest", unit: "cm", lowerIsBetter: false },
  { key: "hipsCm", label: "Hips", unit: "cm", lowerIsBetter: true },
  { key: "armCm", label: "Arm", unit: "cm", lowerIsBetter: false },
  { key: "thighCm", label: "Thigh", unit: "cm", lowerIsBetter: false },
];

export function metricValue(
  measurement: Measurement | undefined,
  key: MetricKey
): number | undefined {
  const value = measurement?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Trailing zeros are noise on a body metric: 82 kg, not 82.0 kg. */
export function formatMetric(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

import type { Measurement } from "@/api/types";

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

export type MetricSummary = MetricMeta & {
  value: number | undefined;
  /** latest minus the previous recorded value for this metric, if any. */
  delta: number | undefined;
};

export type MeasurementStats = {
  /** All measurements, oldest → newest. */
  series: Measurement[];
  /** Most recent measurement, or undefined when there are none. */
  latest: Measurement | undefined;
  /** Per-metric latest value + delta vs the previous reading of that metric. */
  metrics: MetricSummary[];
  /** Weight values (oldest → newest) for the trend chart. */
  weightSeries: number[];
  /** Photos on the most recent measurement. */
  latestPhotos: string[];
  /** Whether any measurement exists. */
  hasData: boolean;
};

function byDateAsc(a: Measurement, b: Measurement): number {
  return a.measuredAt < b.measuredAt ? -1 : a.measuredAt > b.measuredAt ? 1 : 0;
}

export function extractMeasurements(raw: unknown): Measurement[] {
  if (Array.isArray(raw)) return raw as Measurement[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of ["data", "items", "results", "measurements", "docs"]) {
      if (Array.isArray(obj[key])) return obj[key] as Measurement[];
    }
  }
  return [];
}

export function deriveMeasurementStats(raw: unknown): MeasurementStats {
  const series = extractMeasurements(raw).sort(byDateAsc);
  const latest = series[series.length - 1];

  const metrics: MetricSummary[] = METRICS.map((meta) => {
    // Walk newest → oldest to find the latest value and the one before it.
    let value: number | undefined;
    let previous: number | undefined;
    for (let i = series.length - 1; i >= 0; i--) {
      const v = series[i][meta.key];
      if (typeof v !== "number") continue;
      if (value === undefined) value = v;
      else {
        previous = v;
        break;
      }
    }
    const delta =
      value !== undefined && previous !== undefined ? value - previous : undefined;
    return { ...meta, value, delta };
  });

  const weightSeries = series
    .map((m) => m.weightKg)
    .filter((w): w is number => typeof w === "number");

  return {
    series,
    latest,
    metrics,
    weightSeries,
    latestPhotos: latest?.photos ?? [],
    hasData: series.length > 0,
  };
}

/** e.g. -2.9 → "−2.9", 1.5 → "+1.5". Uses a real minus sign. */
export function formatDelta(delta: number, digits = 1): string {
  const rounded = Number(delta.toFixed(digits));
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${sign}${Math.abs(rounded)}`;
}

/** Format a YYYY-MM-DD (or ISO) date as e.g. "Jun 20". */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

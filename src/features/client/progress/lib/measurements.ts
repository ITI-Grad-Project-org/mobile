/**
 * How many measurements every client-side read of the history asks for.
 *
 * One constant because the page size is part of the RTK Query cache key: the
 * Progress screen, the summary card and the Today check-in prompt all want the
 * same rows, and a different limit in any of them would fetch and cache a second
 * copy of the same list.
 */
export const MEASUREMENT_HISTORY_LIMIT = 100;

// The metric metadata and the stats derivation both moved to the shared
// measurements layer once the coach side started reading the same fields.
// Re-exported so this feature's existing imports keep working.
export {
  METRICS,
  formatMetric,
  metricValue,
  type MetricKey,
  type MetricMeta,
} from "@/features/shared/measurements/metrics";

export {
  deriveMeasurementStats,
  extractMeasurements,
  formatDelta,
  formatShortDate,
  type MeasurementStats,
  type MetricSummary,
} from "@/features/shared/measurements/stats";

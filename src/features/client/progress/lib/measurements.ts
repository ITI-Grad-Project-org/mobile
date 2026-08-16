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

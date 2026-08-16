import type { MetricSummary } from "@/features/shared/measurements/stats";
import { formatDelta } from "@/features/shared/measurements/stats";
import { Card } from "@/shared/ui/Card";
import { Text, View } from "@/tw";

export type GridTone = "ink" | "lilac" | "sun" | "peach";

// Literal class names per tone so NativeWind keeps them at build time — a
// template-built class name is invisible to the compiler and comes out unstyled.
const TONE_INK: Record<GridTone, string> = {
  ink: "text-ink-foreground",
  lilac: "text-lilac-ink",
  sun: "text-sun-ink",
  peach: "text-peach-ink",
};

/**
 * Weight leads the headline card on both screens, so the grid surfaces the next
 * most useful metrics rather than repeating it.
 */
export const GRID_KEYS: MetricSummary["key"][] = [
  "waistCm",
  "bodyFatPct",
  "chestCm",
  "thighCm",
];
const GRID_TONES: GridTone[] = ["ink", "lilac", "sun", "peach"];

/** A single toned metric tile: value over an all-caps label, delta beneath. */
export function MetricCard({ metric, tone }: { metric: MetricSummary; tone: GridTone }) {
  const hasValue = metric.value !== undefined;
  const inkClass = TONE_INK[tone];
  // "Good" depends on the metric: waist down is progress, chest up is progress.
  const goodDelta =
    metric.delta !== undefined &&
    metric.delta !== 0 &&
    (metric.lowerIsBetter ? metric.delta < 0 : metric.delta > 0);

  return (
    <Card tone={tone} className="flex-1" glass>
      <Text className={`text-[11px] font-semibold uppercase tracking-wider opacity-70 ${inkClass}`}>
        {metric.label}
      </Text>
      {/* A missing reading is a gap, not a zero — it renders as a dash. */}
      <Text className={`mt-1 text-2xl font-black ${inkClass}`}>
        {hasValue ? `${metric.value} ${metric.unit}` : "—"}
      </Text>
      {metric.delta !== undefined && metric.delta !== 0 ? (
        <Text
          className={`mt-1 text-[11px] ${goodDelta ? "text-success" : `opacity-80 ${inkClass}`}`}
        >
          {formatDelta(metric.delta)} {metric.unit}
        </Text>
      ) : null}
    </Card>
  );
}

/**
 * The 2×2 measurement grid, shared by the client's Progress screen and the
 * coach's check-in detail screen so both read the same body metrics the same
 * way. Pass the full `stats.metrics` list; the grid picks its own four.
 */
export function MetricGrid({ metrics }: { metrics: MetricSummary[] }) {
  const tiles = GRID_KEYS.map((key) => metrics.find((metric) => metric.key === key));

  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        {tiles[0] ? <MetricCard metric={tiles[0]} tone={GRID_TONES[0]} /> : null}
        {tiles[1] ? <MetricCard metric={tiles[1]} tone={GRID_TONES[1]} /> : null}
      </View>
      <View className="flex-row gap-3">
        {tiles[2] ? <MetricCard metric={tiles[2]} tone={GRID_TONES[2]} /> : null}
        {tiles[3] ? <MetricCard metric={tiles[3]} tone={GRID_TONES[3]} /> : null}
      </View>
    </View>
  );
}
MetricGrid.displayName = "MetricGrid";

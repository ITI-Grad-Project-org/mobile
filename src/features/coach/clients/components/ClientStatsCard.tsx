import type { Adherence, Progress } from "@/api/types";
import { StatCell } from "@/shared/ui/StatCell";
import { formatPct } from "@/shared/utils/pct";
import { Text, View } from "@/tw";
import { ActivityIndicator } from "react-native";

interface ClientStatsCardProps {
  adherence?: Adherence;
  progress?: Progress;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Latest weight, plus the change across the window when there are two readings
 * to compare. One reading is still worth showing — it just has no delta. Gaps
 * are skipped, never carried forward.
 */
function weightTrend(progress: Progress | undefined) {
  const weighed = (progress?.measurements ?? []).filter(
    (m): m is typeof m & { weightKg: number } => m.weightKg !== null
  );
  if (weighed.length === 0) return null;

  const latest = weighed[weighed.length - 1].weightKg;
  if (weighed.length < 2) return { latest, delta: null };
  return { latest, delta: latest - weighed[0].weightKg };
}

/**
 * Work in progress that the completed-session count doesn't see.
 *
 * A live response showed `completedSessions: 0` and `sessionCompletionPct: 0`
 * alongside `inProgressSessions: 1` and `setsCompleted: 4` — the client was
 * mid-session. Showing only "0/1 · 0%" would read as "hasn't trained", which is
 * the opposite of what happened.
 */
function progressNote(a: Adherence): string | null {
  const parts: string[] = [];
  if (a.inProgressSessions > 0) {
    parts.push(
      `${a.inProgressSessions} session${a.inProgressSessions === 1 ? "" : "s"} in progress`
    );
  }
  if (a.partialSessions > 0) parts.push(`${a.partialSessions} partial`);
  if (a.setsCompleted > 0 && a.completedSessions === 0) {
    parts.push(`${a.setsCompleted} set${a.setsCompleted === 1 ? "" : "s"} logged`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Whether this client is actually training.
 *
 * Session completion and volume adherence are two independent readings — shown
 * side by side, never averaged. Volume adherence is hidden entirely unless
 * `comparableSets > 0`: RPE and %1RM sets have no absolute target and are
 * excluded from both sides of the ratio, so such a programme returns
 * `comparableSets: 0` with a null ratio meaning "not measurable this way",
 * which is a different statement from "0% of the prescribed work".
 */
export function ClientStatsCard({
  adherence,
  progress,
  isLoading,
  isError,
}: ClientStatsCardProps) {
  const trend = weightTrend(progress);
  const measurable = (adherence?.comparableSets ?? 0) > 0;
  const note = adherence ? progressNote(adherence) : null;

  return (
    <View className="mt-4 rounded-2xl border border-border bg-secondary/30 p-4 gap-y-3">
      <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Training
      </Text>

      {isLoading ? (
        <View className="py-4 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : isError ? (
        // Never an empty state: the per-client route 404s when the membership
        // belongs to another tenant, and "no training data" would hide that.
        <Text className="text-[13px] text-muted-foreground">
          Couldn&apos;t load training data.
        </Text>
      ) : !adherence ? (
        <Text className="text-[13px] text-muted-foreground">No training data yet.</Text>
      ) : (
        <>
          <View className="flex-row">
            <StatCell
              value={`${adherence.completedSessions}/${adherence.scheduledSessions}`}
              label="Sessions"
            />
            <StatCell
              value={formatPct(adherence.sessionCompletionPct)}
              label="Completed"
            />
            {measurable ? (
              <StatCell
                value={formatPct(adherence.volumeAdherencePct)}
                unit={` · ${adherence.comparableSets} sets`}
                label="Volume"
              />
            ) : null}
          </View>

          {note ? (
            <Text className="text-[12px] text-muted-foreground">{note}</Text>
          ) : null}

          {!measurable ? (
            <Text className="text-[12px] text-muted-foreground">
              Volume isn&apos;t measurable on this programme — its sets are
              prescribed by RPE or %1RM rather than an absolute target.
            </Text>
          ) : null}

          {trend ? (
            <View className="flex-row items-center justify-between border-t border-border/40 pt-3">
              <Text className="text-[13px] text-muted-foreground">Weight</Text>
              <Text className="text-[13.5px] font-semibold text-foreground">
                {trend.latest} kg
                {trend.delta !== null ? (
                  <Text className="text-[12px] font-normal text-muted-foreground">
                    {` (${trend.delta > 0 ? "+" : ""}${trend.delta.toFixed(1)} kg)`}
                  </Text>
                ) : null}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { Text, View } from "@/tw";
import {
  energyBalance,
  macroSplit,
  type MacroSlice,
  type MacroTargets,
} from "../lib/macroSplit";
import { formatNumber } from "../lib/normalizePlan";

interface DailyTargetCardProps {
  targets: MacroTargets | null | undefined;
  /** Maintenance calories, when the payload knows them. */
  tdee?: number | null;
  /** Small-caps label above the calorie figure. */
  kicker?: string;
  /**
   * Chip text for the head's right slot. Takes the place of the TDEE balance —
   * a single day compares against what's actually plated, not maintenance.
   */
  trailing?: string | null;
}

/** Legend cells are weighted so the two four-cal macros get equal room. */
const LEGEND_FLEX: Record<string, string> = {
  carbs: "flex-[2]",
  protein: "flex-[2]",
  fat: "flex-[1.6]",
};

/**
 * The daily prescription: calories, how they split across macros, and the two
 * compliance targets that aren't macros at all.
 *
 * Water and fibre live in the footer rather than the macro grid on purpose —
 * they're adherence checks, not part of the energy budget.
 */
export function DailyTargetCard({
  targets,
  tdee,
  kicker = "Daily target",
  trailing,
}: DailyTargetCardProps) {
  const calories = numberOf(targets?.calories);
  const water = numberOf(targets?.waterMl);
  const fiber = numberOf(targets?.fiberG);
  const slices = macroSplit(targets);
  const balance = energyBalance(calories, tdee);
  const chip = trailing ?? balance?.label ?? null;

  // Nothing prescribed at all — the card would be an empty frame.
  if (calories === null && slices.length === 0 && water === null && fiber === null) {
    return null;
  }

  return (
    <View className="gap-3 rounded-lg border border-mint/20 bg-card px-3.75 py-3.5">
      {/* Head */}
      <View className="flex-row items-end justify-between gap-3">
        <View>
          <Text className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {kicker}
          </Text>
          <View className="mt-1 flex-row items-baseline gap-1.5">
            <Text className="text-3xl font-bold leading-none tracking-tight text-foreground">
              {calories !== null ? formatNumber(calories) : "—"}
            </Text>
            <Text className="text-[13px] font-semibold text-muted-foreground">kcal</Text>
          </View>
        </View>

        {chip ? (
          <View className="rounded-[14px] bg-mint/12 px-2.5 py-1.25">
            <Text className="text-[11px] font-semibold text-mint-ink">{chip}</Text>
          </View>
        ) : null}
      </View>

      {slices.length > 0 ? (
        <>
          {/* Split bar — flexed by calorie share, not grams */}
          <View className="h-2 flex-row gap-0.5 overflow-hidden rounded-[5px]">
            {slices.map((slice) => (
              <View
                key={slice.key}
                className={cn("h-full", slice.fillClassName)}
                // The one place a computed value has to reach the layout: a
                // percentage class per slice can't be enumerated ahead of time.
                style={{ flexGrow: slice.percent, flexBasis: 0 }}
              />
            ))}
          </View>

          {/* Legend */}
          <View className="flex-row">
            {slices.map((slice) => (
              <MacroLegendCell key={slice.key} slice={slice} />
            ))}
          </View>
        </>
      ) : null}

      {water !== null || fiber !== null ? (
        <View className="flex-row gap-2.5 border-t border-border pt-2.5">
          {water !== null ? (
            <FooterCell icon="droplets" value={formatNumber(water)} unit="ml" label="water" />
          ) : null}
          {water !== null && fiber !== null ? <View className="w-px bg-border" /> : null}
          {fiber !== null ? (
            <FooterCell icon="apple" value={`${formatNumber(fiber)}g`} label="fiber" />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function MacroLegendCell({ slice }: { slice: MacroSlice }) {
  return (
    <View className={cn("gap-0.75", LEGEND_FLEX[slice.key] ?? "flex-1")}>
      <View className="flex-row items-center gap-1.5">
        <View className={cn("h-1.75 w-1.75 rounded-sm", slice.fillClassName)} />
        <Text className="text-[15px] font-semibold text-foreground">
          {formatNumber(slice.grams)}
          <Text className="text-[11px] text-muted-foreground">g</Text>
        </Text>
      </View>
      <Text className="text-[9.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
        {slice.label} · {slice.percent}%
      </Text>
    </View>
  );
}

function FooterCell({
  icon,
  value,
  unit,
  label,
}: {
  icon: IconName;
  value: string;
  unit?: string;
  label: string;
}) {
  return (
    <View className="flex-1 flex-row items-center gap-2">
      <Icon name={icon} size={15} color="--muted-foreground" />
      <Text className="text-[13.5px] font-semibold text-foreground">
        {value}
        {unit ? <Text className="text-[11px] text-muted-foreground">{unit}</Text> : null}
      </Text>
      <Text className="text-[9.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

function numberOf(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

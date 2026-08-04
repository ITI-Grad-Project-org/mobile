import type { NutritionTargets } from "@/api/types";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Text, View } from "@/tw";
import { formatKcal, type Macros } from "../data";
import { MacroBar } from "./MacroBar";

/**
 * The day's calorie and macro targets. When a log exists, `consumed` turns the
 * card into a progress view; without one it just states the prescription.
 */
export function TargetsCard({
  targets,
  consumed,
  title = "Daily target",
}: {
  targets: NutritionTargets;
  consumed?: Macros;
  title?: string;
}) {
  const targetCalories = targets.targetCalories;
  const eaten = consumed?.calories ?? 0;
  const remaining =
    typeof targetCalories === "number" ? Math.round(targetCalories - eaten) : null;

  return (
    <Card tone="mint" glass>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-mint-ink opacity-70">
            {title}
          </Text>
          <View className="mt-1 flex-row items-baseline gap-2">
            <Text className="text-3xl font-black text-mint-ink">
              {consumed
                ? formatKcal(eaten)
                : typeof targetCalories === "number"
                  ? formatKcal(targetCalories)
                  : "—"}
            </Text>
            <Text className="text-[13px] text-mint-ink opacity-80">
              {consumed && typeof targetCalories === "number"
                ? `of ${formatKcal(targetCalories)} kcal`
                : "kcal"}
            </Text>
          </View>
        </View>
        <Icon name="flame" size={20} color="--mint-ink" />
      </View>

      {consumed && remaining !== null ? (
        <Text className="mt-0.5 text-[12px] font-medium text-mint-ink opacity-80">
          {remaining >= 0
            ? `${formatKcal(remaining)} kcal left today`
            : `${formatKcal(Math.abs(remaining))} kcal over target`}
        </Text>
      ) : null}

      <View className="mt-3 flex-row gap-3">
        <MacroBar
          variant="mint"
          label="Protein"
          consumed={consumed?.proteinG ?? targets.targetProteinG ?? 0}
          target={consumed ? targets.targetProteinG : undefined}
          unit="g"
        />
        <MacroBar
          variant="mint"
          label="Carbs"
          consumed={consumed?.carbsG ?? targets.targetCarbsG ?? 0}
          target={consumed ? targets.targetCarbsG : undefined}
          unit="g"
        />
        <MacroBar
          variant="mint"
          label="Fat"
          consumed={consumed?.fatG ?? targets.targetFatG ?? 0}
          target={consumed ? targets.targetFatG : undefined}
          unit="g"
        />
      </View>
    </Card>
  );
}

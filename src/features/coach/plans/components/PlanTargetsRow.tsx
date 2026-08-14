import { Card } from "@/shared/ui/Card";
import { Text, View } from "@/tw";
import { formatNumber } from "../lib/normalizePlan";

interface PlanTargetsRowProps {
  /** A `ClientNutritionTargetsResponseDto`-shaped bag; missing keys are skipped. */
  targets: any;
  title: string;
  hint?: string | null;
}

const FIELDS: { key: string; label: string; suffix: string }[] = [
  { key: "calories", label: "kcal", suffix: "" },
  { key: "proteinG", label: "protein", suffix: "g" },
  { key: "carbsG", label: "carbs", suffix: "g" },
  { key: "fatG", label: "fat", suffix: "g" },
  { key: "fiberG", label: "fiber", suffix: "g" },
  { key: "waterMl", label: "water", suffix: "ml" },
];

/**
 * The macro prescription as a compact row. The client-side TargetsCard reads a
 * different (log-flavoured) shape, so the coach surfaces render the raw
 * targets bag the plan endpoints return.
 */
export function PlanTargetsRow({ targets, title, hint }: PlanTargetsRowProps) {
  const values = FIELDS.map((field) => ({
    ...field,
    value: typeof targets?.[field.key] === "number" ? (targets[field.key] as number) : null,
  })).filter((field) => field.value !== null);

  if (values.length === 0) return null;

  return (
    <Card glass className="p-4">
      <View className="flex-row items-baseline gap-2">
        <Text className="flex-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </Text>
        {hint ? <Text className="text-[11px] text-muted-foreground">{hint}</Text> : null}
      </View>

      <View className="mt-3 flex-row flex-wrap gap-x-6 gap-y-3">
        {values.map((field) => (
          <View key={field.key}>
            <Text
              className="text-[17px] font-bold text-foreground"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {formatNumber(field.value as number)}
              {field.suffix}
            </Text>
            <Text className="mt-0.5 text-[11px] text-muted-foreground">{field.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

import {
  useGetNutritionDayLogQuery,
  useGetNutritionPlanQuery,
} from "@/api/endpoints/nutritionPlans.endpoints";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { PlanDetailHeader } from "@/shared/ui/PlanDetailHeader";
import { SectionHeader } from "@/shared/ui/SectionHeader";
import { ScrollView, Text, View } from "@/tw";
import { useMemo } from "react";
import { NotLoggedYet, PlanLoading, PlanNotFound } from "../components/PlanStates";
import { DailyTargetCard } from "../components/DailyTargetCard";
import { findDayById, formatDayDate, mealsOf } from "../lib/coachPlanDays";
import { formatNumber, humanize, normalizePlan } from "../lib/normalizePlan";

interface CoachNutritionDayScreenProps {
  planId: string;
  dayId: string;
}

export function CoachNutritionDayScreen({ planId, dayId }: CoachNutritionDayScreenProps) {
  const { tenantId } = useActiveTenant();

  const { data, isLoading, isError } = useGetNutritionPlanQuery(
    { tenantId: tenantId ?? "", planId },
    { skip: !tenantId || !planId }
  );

  const log = useGetNutritionDayLogQuery(
    { tenantId: tenantId ?? "", planId, dayId },
    { skip: !tenantId || !planId || !dayId }
  );

  const plan = useMemo(() => normalizePlan(data, "nutrition"), [data]);
  const day = useMemo(() => findDayById(data, dayId), [data, dayId]);
  const meals = useMemo(() => mealsOf(day), [day]);

  if (isLoading) return <PlanLoading label="Loading day…" />;

  if (isError || !day) {
    return (
      <PlanNotFound title="Day not found" hint="This day is no longer part of the plan." />
    );
  }

  const dayNumber = Number(day?.dayNumber ?? 0);
  const date = formatDayDate(day?.scheduledDate ?? day?.date ?? null);
  const title = date ?? (dayNumber ? `Day ${dayNumber}` : "Nutrition day");

  const tags = [
    plan?.client?.name ?? null,
    day?.isFlexibleDay ? "flexible day" : null,
    `${meals.length} ${meals.length === 1 ? "meal" : "meals"}`,
  ].filter(Boolean) as string[];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-screen"
      showsVerticalScrollIndicator={false}
    >
      <PlanDetailHeader
        eyebrow={plan?.name ?? "Nutrition plan"}
        tone="mint"
        title={title}
        subtitle={day?.notes || null}
        tags={tags}
      />

      <View className="gap-y-4 p-4">
        <DailyTargetCard
          targets={day?.effectiveTargets}
          kicker="Target for this day"
          trailing={
            typeof day?.prescribedTotals?.calories === "number"
              ? `${formatNumber(day.prescribedTotals.calories)} kcal planned`
              : null
          }
        />

        {meals.length === 0 ? (
          <Card glass className="items-center py-8">
            <Icon name="apple" size={26} color="--muted-foreground" />
            <Text className="mt-2 text-[14px] font-semibold text-foreground">
              No meals prescribed
            </Text>
            <Text className="mt-1 text-center text-[12px] text-muted-foreground">
              {day?.isFlexibleDay
                ? "This day is flexible — the client eats to the targets above."
                : "Add meals to this day on the dashboard."}
            </Text>
          </Card>
        ) : (
          <View className="gap-y-2.5">
            <SectionHeader
              label="Prescribed meals"
              hint={`${meals.length} ${meals.length === 1 ? "meal" : "meals"}`}
            />
            {meals.map((meal: any, index: number) => (
              <MealCard key={String(meal?.id ?? index)} meal={meal} />
            ))}
          </View>
        )}

        <View className="gap-y-2.5">
          <SectionHeader label="What the client logged" />
          {log.isLoading ? (
            <View className="items-center py-6">
              <Text className="text-[12px] text-muted-foreground">Loading log…</Text>
            </View>
          ) : log.isError || !log.data ? (
            <NotLoggedYet noun="day" />
          ) : (
            <NutritionReviewCard review={log.data} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function MealCard({ meal }: { meal: any }) {
  const foods = Array.isArray(meal?.foods) ? meal.foods : [];
  const totals = meal?.totals ?? {};
  const chips = [
    humanize(meal?.slot),
    meal?.suggestedTime ? String(meal.suggestedTime) : null,
    ...(Array.isArray(meal?.dietaryTags) ? meal.dietaryTags.map(humanize) : []),
  ].filter(Boolean) as string[];

  const macroLine = [
    typeof totals.calories === "number" ? `${formatNumber(totals.calories)} kcal` : null,
    typeof totals.proteinG === "number" ? `${formatNumber(totals.proteinG)}g protein` : null,
    typeof totals.carbsG === "number" ? `${formatNumber(totals.carbsG)}g carbs` : null,
    typeof totals.fatG === "number" ? `${formatNumber(totals.fatG)}g fat` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="p-4">
      <Text className="text-[14.5px] font-semibold text-foreground">
        {meal?.mealName || humanize(meal?.slot) || "Meal"}
      </Text>

      {macroLine ? (
        <Text className="mt-0.5 text-[12px] text-muted-foreground">{macroLine}</Text>
      ) : null}

      {chips.length > 0 ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {chips.map((chip) => (
            <View key={chip} className="rounded-full bg-secondary px-2.5 py-0.5">
              <Text className="text-[10.5px] font-medium capitalize text-muted-foreground">
                {chip}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {foods.length > 0 ? (
        <View className="mt-3 gap-y-1.5">
          {foods.map((food: any, index: number) => (
            <View
              key={String(food?.id ?? index)}
              className="flex-row items-center gap-x-3 rounded-xl bg-secondary/50 px-3 py-2"
            >
              <Text className="min-w-0 flex-1 text-[13px] text-foreground" numberOfLines={1}>
                {food?.foodName || food?.name || "Food"}
              </Text>
              <Text className="shrink-0 text-[12px] text-muted-foreground">
                {describeFood(food)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {meal?.coachNotes ? (
        <Text className="mt-3 text-[12px] leading-5 text-muted-foreground">{meal.coachNotes}</Text>
      ) : null}

      {Array.isArray(meal?.allergens) && meal.allergens.length > 0 ? (
        <Text className="mt-2 text-[11.5px] text-destructive">
          Allergens: {meal.allergens.join(", ")}
        </Text>
      ) : null}
    </Card>
  );
}

/** "150 g · 240 kcal" from whichever quantity fields a planned food carries. */
function describeFood(food: any): string {
  const quantity =
    food?.quantity ?? food?.amount ?? food?.quantityG ?? food?.servingSize ?? null;
  const unit = food?.unit ?? food?.measurementUnit ?? (food?.quantityG != null ? "g" : "");
  const calories = food?.calories ?? food?.totals?.calories ?? null;

  return [
    quantity != null ? `${quantity}${unit ? ` ${unit}` : ""}` : null,
    typeof calories === "number" ? `${formatNumber(calories)} kcal` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

const MACROS: { key: string; label: string; suffix: string }[] = [
  { key: "calories", label: "Calories", suffix: "" },
  { key: "proteinG", label: "Protein", suffix: "g" },
  { key: "carbsG", label: "Carbs", suffix: "g" },
  { key: "fatG", label: "Fat", suffix: "g" },
];

/**
 * The coach review payload — prescribed vs reported vs actual. Its three bags
 * are declared as bare objects in the API schema, so every field is probed
 * rather than assumed, and an empty review falls back to "not logged yet".
 */
function NutritionReviewCard({ review }: { review: any }) {
  const comparisons = review?.comparisons ?? null;
  const reported = review?.reportedAdherence ?? null;
  const actual = review?.actualIntake ?? null;

  if (!comparisons && !reported && !actual) return <NotLoggedYet noun="day" />;

  const prescribedTotals = comparisons?.prescribed ?? comparisons?.prescribedTotals ?? null;
  const actualTotals =
    comparisons?.actual ?? comparisons?.actualTotals ?? actual?.totals ?? null;

  const rows = MACROS.map((macro) => ({
    ...macro,
    planned: numberOrNull(prescribedTotals?.[macro.key]),
    logged: numberOrNull(actualTotals?.[macro.key]),
  })).filter((row) => row.planned !== null || row.logged !== null);

  const notes = reported?.notes ?? null;
  const water = numberOrNull(reported?.waterMl ?? actual?.waterMl);
  const state = reported?.state ? String(reported.state).replace(/_/g, " ") : null;

  return (
    <Card className="p-4">
      {state ? (
        <View className="mb-3 flex-row items-center gap-x-2">
          <Icon name="check" size={15} color="--mint-ink" />
          <Text className="text-[13.5px] font-semibold capitalize text-foreground">{state}</Text>
        </View>
      ) : null}

      {rows.length > 0 ? (
        <View className="gap-y-2">
          <View className="flex-row items-baseline gap-x-3">
            <Text className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Macro
            </Text>
            <Text className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Planned
            </Text>
            <Text className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Logged
            </Text>
          </View>

          {rows.map((row) => (
            <View key={row.key} className="flex-row items-baseline gap-x-3">
              <Text className="w-20 shrink-0 text-[12.5px] text-muted-foreground">
                {row.label}
              </Text>
              <Text
                className="flex-1 text-[13px] text-foreground"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {row.planned !== null ? `${formatNumber(row.planned)}${row.suffix}` : "—"}
              </Text>
              <Text
                className="flex-1 text-[13px] font-medium text-foreground"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {row.logged !== null ? `${formatNumber(row.logged)}${row.suffix}` : "—"}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-[12.5px] text-muted-foreground">
          The client reported this day without macro detail.
        </Text>
      )}

      {water !== null ? (
        <Text className="mt-3 text-[12.5px] text-muted-foreground">
          Water: {formatNumber(water)} ml
        </Text>
      ) : null}

      {notes ? (
        <Text className="mt-2 text-[12.5px] leading-5 text-muted-foreground">{notes}</Text>
      ) : null}
    </Card>
  );
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

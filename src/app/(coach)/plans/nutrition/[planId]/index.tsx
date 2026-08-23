import { CoachNutritionPlanDetailsScreen } from "@/features/coach/plans";
import { useLocalSearchParams } from "expo-router";

export default function CoachNutritionPlanRoute() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  return <CoachNutritionPlanDetailsScreen planId={planId || ""} />;
}

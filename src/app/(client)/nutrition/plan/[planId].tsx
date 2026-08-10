import { NutritionPlanDetailsScreen } from "@/features/client/nutrition";
import { useLocalSearchParams } from "expo-router";

export default function NutritionPlanRoute() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  return <NutritionPlanDetailsScreen planId={planId || ""} />;
}

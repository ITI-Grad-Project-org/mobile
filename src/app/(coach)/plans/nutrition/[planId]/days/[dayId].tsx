import { CoachNutritionDayScreen } from "@/features/coach/plans";
import { useLocalSearchParams } from "expo-router";

export default function CoachNutritionDayRoute() {
  const { planId, dayId } = useLocalSearchParams<{ planId: string; dayId: string }>();
  return <CoachNutritionDayScreen planId={planId || ""} dayId={dayId || ""} />;
}

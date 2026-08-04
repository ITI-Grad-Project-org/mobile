import { NutritionLogScreen } from "@/features/client/nutrition";
import { useLocalSearchParams } from "expo-router";

export default function NutritionDayRoute() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  return <NutritionLogScreen dayId={dayId || ""} />;
}

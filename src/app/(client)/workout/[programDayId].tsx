import { WorkoutLogScreen } from "@/features/client/workout";
import { useLocalSearchParams } from "expo-router";

export default function WorkoutRoute() {
  const { programDayId } = useLocalSearchParams<{ programDayId: string }>();
  return <WorkoutLogScreen programDayId={programDayId || ""} />;
}

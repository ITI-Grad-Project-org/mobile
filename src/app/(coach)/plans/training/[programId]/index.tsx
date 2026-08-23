import { CoachProgramDetailsScreen } from "@/features/coach/plans";
import { useLocalSearchParams } from "expo-router";

export default function CoachProgramRoute() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  return <CoachProgramDetailsScreen programId={programId || ""} />;
}

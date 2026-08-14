import { CoachProgramDayScreen } from "@/features/coach/plans";
import { useLocalSearchParams } from "expo-router";

export default function CoachProgramDayRoute() {
  const { programId, programDayId } = useLocalSearchParams<{
    programId: string;
    programDayId: string;
  }>();
  return (
    <CoachProgramDayScreen
      programId={programId || ""}
      programDayId={programDayId || ""}
    />
  );
}

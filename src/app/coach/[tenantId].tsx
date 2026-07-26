import { CoachProfileScreen } from "@/features/client/coach-profile";
import { useLocalSearchParams } from "expo-router";

export default function ClientCoachProfileRoute() {
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  return <CoachProfileScreen tenantId={tenantId} />;
}

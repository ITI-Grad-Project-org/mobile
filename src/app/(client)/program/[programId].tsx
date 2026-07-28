import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ProgramDetailsScreen } from "@/features/client/program";

export default function ProgramRoute() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  return <ProgramDetailsScreen programId={programId || ""} />;
}

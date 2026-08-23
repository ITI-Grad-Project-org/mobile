import { cn } from "@/lib/utils";
import { Text } from "@/tw";

import { SPECIALTY_TINT, specialtyDomain, specialtyLabel } from "../lib/specialties";

/**
 * One specialty, humanised and tinted by domain. Both decisions come from
 * lib/specialties.ts — this component only draws.
 */
export function SpecialtyChip({ specialty }: { specialty: string }) {
  const label = specialtyLabel(specialty);
  if (!label) return null;

  return (
    <Text
      className={cn(
        "rounded-full border px-3.5 py-[7px] text-[12.5px] font-medium",
        SPECIALTY_TINT[specialtyDomain(specialty)]
      )}
    >
      {label}
    </Text>
  );
}

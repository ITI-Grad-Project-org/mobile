import { Segmented } from "@/shared/ui/Segmented";

export type PlanSub = "training" | "nutrition";

const OPTIONS = [
  { value: "training", label: "Training" },
  { value: "nutrition", label: "Nutrition" },
] as const;

export function PlanSegmented({
  value,
  onChange,
}: {
  value: PlanSub;
  onChange: (v: PlanSub) => void;
}) {
  return (
    <Segmented
      options={OPTIONS}
      value={value}
      onChange={onChange}
      duration={250}
    />
  );
}

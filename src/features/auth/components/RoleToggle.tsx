import { Segmented } from "@/shared/ui/Segmented";

export type AuthRole = "client" | "coach";

const OPTIONS = [
  { value: "client", label: "I'm a client" },
  { value: "coach", label: "I'm a coach" },
] as const;

export function RoleToggle({
  role,
  onChange,
}: {
  role: AuthRole;
  onChange: (r: AuthRole) => void;
}) {
  return (
    <Segmented
      options={OPTIONS}
      value={role}
      onChange={onChange}
      labelClassName="font-semibold"
    />
  );
}

export type Role = "owner" | "client";

export function useRole(): Role | null {
  return "client";
}

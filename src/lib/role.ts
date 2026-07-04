import { useRole as useSharedRole } from "@/shared/hooks/useRole";

export function useRole() {
  const role = useSharedRole() || "client";
  return {
    role,
    accent: "green" as "green" | "orange",
    clientProfile: {
      fname: "Alex",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=200&q=80",
    },
  };
}

export function useActiveCoach() {
  return {
    name: "Coach Mike",
    planType: "strength" as "strength" | "yoga" | "endurance" | "weightloss",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  };
}
